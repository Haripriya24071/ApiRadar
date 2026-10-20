import re
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent

router = APIRouter(prefix="/forecasts", tags=["forecasts"])
SOURCE_URL = re.compile(r"^https?://[^\s]+$", re.IGNORECASE)
ACTIONABLE_SEVERITY = {"WARNING", "CRITICAL"}
HISTORY_DAYS = 730
MIN_COVERAGE_DAYS = 180
MIN_SOURCE_UPDATES = 20
MIN_ACTIONABLE_UPDATES = 3


class ForecastEvidence(BaseModel):
    title: str
    severity: str
    published_at: Optional[datetime] = None
    url: str


class ForecastResponse(BaseModel):
    id: str
    api_slug: str
    api_name: str
    logo_url: Optional[str] = None
    forecast_type: Literal["trend_risk", "announced_change"]
    status: Literal["forecast", "insufficient_history", "low_risk", "scheduled"]
    probability_percent: Optional[int] = None
    confidence: Literal["low", "medium", "high"]
    horizon_days: int
    expected_by: Optional[date] = None
    title: str
    summary: str
    source_updates: int
    actionable_updates: int
    observed_days: int
    generated_at: datetime
    evidence: list[ForecastEvidence]


def _source_url(raw_content: Optional[str]) -> Optional[str]:
    if not raw_content:
        return None
    first_line = raw_content.splitlines()[0].strip()
    if SOURCE_URL.fullmatch(first_line):
        return first_line
    return None


def _normalized_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@router.get("", response_model=list[ForecastResponse])
async def get_forecasts(
    api_slugs: Optional[str] = Query(None, description="Comma-separated API slugs"),
    horizon_days: int = Query(90, ge=30, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Return a conservative, evidence-linked 90-day change-risk estimate.

    The trend estimate uses a Beta(1, 19) prior on the rate of WARNING/CRITICAL
    source updates and projects that rate over the requested horizon. It only
    emits a positive forecast when there is at least six months of sourced
    history, twenty distinct source updates, and three actionable updates.
    Explicit, sourced future deadlines are returned separately as announced
    changes and are never represented as model predictions.
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    horizon_end = today + timedelta(days=horizon_days)
    history_start = now - timedelta(days=HISTORY_DAYS)
    requested_slugs = {slug.strip() for slug in (api_slugs or "").split(",") if slug.strip()}

    apis_result = await db.execute(select(APICatalog).order_by(APICatalog.name))
    apis = [api for api in apis_result.scalars().all() if not requested_slugs or api.slug in requested_slugs]
    if requested_slugs:
        apis = [api for api in apis if api.slug in requested_slugs]
    api_by_id = {api.id: api for api in apis}
    if not api_by_id:
        return []

    events_result = await db.execute(
        select(ChangeEvent).where(
            ChangeEvent.api_id.in_(api_by_id.keys()),
            ChangeEvent.published_at.is_not(None),
            ChangeEvent.published_at >= history_start,
        ).order_by(ChangeEvent.published_at.desc())
    )
    events = events_result.scalars().all()

    # Scraper summaries can create several rows from one feed entry. Collapse
    # those by their canonical source URL so one post cannot inflate the rate.
    observations: dict[str, dict[str, dict]] = defaultdict(dict)
    scheduled_by_source: dict[tuple[str, str, date], ForecastResponse] = {}
    for event in events:
        api = api_by_id.get(event.api_id)
        source_url = _source_url(event.raw_content)
        published_at = _normalized_datetime(event.published_at)
        if not api or not source_url or not published_at:
            continue
        severity = (event.severity or "INFO").upper()
        observation_key = f"{event.source}:{source_url}"
        current = observations[str(api.id)].get(observation_key)
        rank = {"INFO": 0, "WARNING": 1, "CRITICAL": 2}
        if current is None or rank.get(severity, 0) > rank.get(current["severity"], 0):
            observations[str(api.id)][observation_key] = {
                "title": event.title,
                "severity": severity,
                "published_at": published_at,
                "url": source_url,
                "deadline_date": event.deadline_date,
            }

        # Only a source-linked, explicitly dated warning is a confirmed
        # schedule. This keeps unsupported sample data out of the forecast.
        if (
            severity in ACTIONABLE_SEVERITY
            and event.deadline_date
            and today < event.deadline_date <= horizon_end
        ):
            schedule_key = (api.slug, source_url, event.deadline_date)
            scheduled_by_source.setdefault(schedule_key, ForecastResponse(
                id=f"scheduled:{event.id}",
                api_slug=api.slug,
                api_name=api.name,
                logo_url=api.logo_url,
                forecast_type="announced_change",
                status="scheduled",
                probability_percent=100,
                confidence="high",
                horizon_days=horizon_days,
                expected_by=event.deadline_date,
                title=event.title,
                summary="The provider’s published source includes this upcoming deadline. This is a documented date, not an ApiRadar prediction.",
                source_updates=0,
                actionable_updates=0,
                observed_days=0,
                generated_at=now,
                evidence=[ForecastEvidence(title=event.title, severity=severity, published_at=published_at, url=source_url)],
            ))

    forecasts: list[ForecastResponse] = []
    for api in apis:
        api_observations = list(observations.get(str(api.id), {}).values())
        api_observations.sort(key=lambda item: item["published_at"])
        observation_count = len(api_observations)
        actionable = [item for item in api_observations if item["severity"] in ACTIONABLE_SEVERITY]
        actionable_count = len(actionable)
        observed_days = (
            max(0, (api_observations[-1]["published_at"] - api_observations[0]["published_at"]).days)
            if observation_count > 1 else 0
        )
        sufficiently_observed = (
            observed_days >= MIN_COVERAGE_DAYS
            and observation_count >= MIN_SOURCE_UPDATES
            and actionable_count >= MIN_ACTIONABLE_UPDATES
        )
        if sufficiently_observed:
            # Beta-binomial smoothing prevents a handful of incidents from
            # being treated as certainty. Project only an incident risk rate;
            # it does not guess an endpoint or claim a provider roadmap.
            posterior_actionable_rate = (actionable_count + 1) / (observation_count + 20)
            expected_updates = observation_count * horizon_days / observed_days
            probability = round(100 * (1 - (1 - posterior_actionable_rate) ** expected_updates))
            confidence: Literal["low", "medium", "high"] = (
                "high" if observed_days >= 365 and observation_count >= 50 and actionable_count >= 5 else "medium"
            )
            status: Literal["forecast", "insufficient_history", "low_risk", "scheduled"] = (
                "forecast" if probability >= 20 else "low_risk"
            )
            title = "Elevated chance of another breaking or deprecation signal" if status == "forecast" else "No elevated change risk detected"
            summary = (
                f"A smoothed historical rate estimates a {probability}% chance of at least one warning or breaking-change signal "
                f"in the next {horizon_days} days. It is based on {actionable_count} actionable source updates among "
                f"{observation_count} distinct updates over {observed_days} observed days. This is an experimental trend estimate, "
                "not a claim about a specific future endpoint or announced roadmap."
            )
        else:
            probability = None
            confidence = "low"
            status = "insufficient_history"
            title = "Not enough verified history for a forecast"
            summary = (
                f"ApiRadar has {actionable_count} sourced warning or breaking-change updates among {observation_count} distinct "
                f"provider updates across {observed_days} observed days. The current forecast needs at least "
                f"{MIN_ACTIONABLE_UPDATES} actionable updates, {MIN_SOURCE_UPDATES} source updates, and "
                f"{MIN_COVERAGE_DAYS} days of history."
            )

        examples = sorted(actionable, key=lambda item: item["published_at"], reverse=True)[:3]
        forecasts.append(ForecastResponse(
            id=f"risk:{api.slug}",
            api_slug=api.slug,
            api_name=api.name,
            logo_url=api.logo_url,
            forecast_type="trend_risk",
            status=status,
            probability_percent=probability,
            confidence=confidence,
            horizon_days=horizon_days,
            expected_by=horizon_end,
            title=title,
            summary=summary,
            source_updates=observation_count,
            actionable_updates=actionable_count,
            observed_days=observed_days,
            generated_at=now,
            evidence=[ForecastEvidence(**item) for item in examples],
        ))

    forecasts.extend(scheduled_by_source.values())
    forecasts.sort(key=lambda item: (
        item.status != "scheduled",
        -(item.probability_percent or 0),
        item.api_name.casefold(),
    ))
    return forecasts
