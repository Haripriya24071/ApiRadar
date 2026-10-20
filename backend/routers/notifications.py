import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_user
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent
from models.forecast_notification import ForecastNotification
from models.notification import Notification
from models.stack_profile import StackProfile, WatchedAPI
from models.user import User
from routers.changes import ChangeEventResponse
from routers.forecasts import get_forecasts

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationResponse(BaseModel):
    id: uuid.UUID
    is_read: bool
    created_at: datetime
    kind: Literal["change", "forecast"]
    title: str
    message: Optional[str] = None
    severity: Optional[str] = None
    api_name: Optional[str] = None
    api_slug: Optional[str] = None
    probability_percent: Optional[int] = None
    confidence: Optional[str] = None
    change_event: Optional[ChangeEventResponse] = None


def _forecast_key(api_slug: str, generated_at: datetime) -> str:
    quarter = (generated_at.month - 1) // 3 + 1
    return f"trend-risk:{api_slug}:{generated_at.year}-Q{quarter}"


async def _sync_forecast_notifications(current_user: User, db: AsyncSession) -> None:
    """Create at most one forecast alert per watched API and calendar quarter."""
    watched_result = await db.execute(
        select(APICatalog.slug)
        .join(WatchedAPI, WatchedAPI.api_id == APICatalog.id)
        .join(StackProfile, StackProfile.id == WatchedAPI.profile_id)
        .where(StackProfile.user_id == current_user.id)
        .distinct()
    )
    api_slugs = sorted(set(watched_result.scalars().all()))
    if not api_slugs:
        return

    forecasts = await get_forecasts(api_slugs=",".join(api_slugs), horizon_days=90, db=db)
    rows = [
        {
            "id": uuid.uuid4(),
            "user_id": current_user.id,
            "forecast_key": _forecast_key(item.api_slug, item.generated_at),
            "api_slug": item.api_slug,
            "api_name": item.api_name,
            "title": item.title,
            "message": item.summary,
            "probability_percent": item.probability_percent,
            "confidence": item.confidence,
            "is_read": False,
        }
        for item in forecasts
        if item.forecast_type == "trend_risk"
        and item.status == "forecast"
        and item.probability_percent is not None
    ]
    if not rows:
        return

    dialect = db.get_bind().dialect.name
    if dialect == "sqlite":
        statement = sqlite_insert(ForecastNotification).values(rows).on_conflict_do_nothing(
            index_elements=["user_id", "forecast_key"]
        )
    elif dialect == "postgresql":
        statement = postgres_insert(ForecastNotification).values(rows).on_conflict_do_nothing(
            index_elements=["user_id", "forecast_key"]
        )
    else:
        # The app currently supports SQLite and PostgreSQL. Keep an ORM fallback
        # for other SQLAlchemy dialects used by local development.
        for row in rows:
            exists = await db.scalar(select(ForecastNotification.id).where(
                ForecastNotification.user_id == row["user_id"],
                ForecastNotification.forecast_key == row["forecast_key"],
            ))
            if exists is None:
                db.add(ForecastNotification(**row))
        await db.commit()
        return

    await db.execute(statement)
    await db.commit()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _sync_forecast_notifications(current_user, db)

    changes_result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .options(selectinload(Notification.change_event).selectinload(ChangeEvent.api))
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    change_notifications = changes_result.scalars().all()
    forecasts_result = await db.execute(
        select(ForecastNotification)
        .where(ForecastNotification.user_id == current_user.id)
        .order_by(ForecastNotification.created_at.desc())
        .limit(20)
    )
    forecast_notifications = forecasts_result.scalars().all()

    unread_change_count = await db.scalar(select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    )) or 0
    unread_forecast_count = await db.scalar(select(func.count()).where(
        ForecastNotification.user_id == current_user.id,
        ForecastNotification.is_read.is_(False),
    )) or 0
    response.headers["X-Unread-Count"] = str(unread_change_count + unread_forecast_count)

    result = [
        {
            "id": item.id,
            "is_read": item.is_read,
            "created_at": item.created_at,
            "kind": "change",
            "title": item.change_event.title,
            "message": item.change_event.what_changed or item.change_event.migration_summary,
            "severity": item.change_event.severity,
            "api_name": item.change_event.api.name if item.change_event.api else None,
            "api_slug": item.change_event.api.slug if item.change_event.api else None,
            "change_event": item.change_event,
        }
        for item in change_notifications
    ]
    result.extend(
        {
            "id": item.id,
            "is_read": item.is_read,
            "created_at": item.created_at,
            "kind": "forecast",
            "title": item.title,
            "message": item.message,
            "severity": "FORECAST",
            "api_name": item.api_name,
            "api_slug": item.api_slug,
            "probability_percent": item.probability_percent,
            "confidence": item.confidence,
        }
        for item in forecast_notifications
    )
    result.sort(key=lambda item: _as_utc(item["created_at"]), reverse=True)
    return result[:20]


@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _sync_forecast_notifications(current_user, db)
    change_result = await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    forecast_result = await db.execute(
        update(ForecastNotification)
        .where(ForecastNotification.user_id == current_user.id, ForecastNotification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return {"updated": (change_result.rowcount or 0) + (forecast_result.rowcount or 0)}


@router.patch("/read/{notification_id}")
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    change = await db.scalar(select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ))
    if change is not None:
        change.is_read = True
    else:
        forecast = await db.scalar(select(ForecastNotification).where(
            ForecastNotification.id == notification_id,
            ForecastNotification.user_id == current_user.id,
        ))
        if forecast is None:
            raise HTTPException(status_code=404, detail="Notification not found")
        forecast.is_read = True
    await db.commit()
    return {"updated": True}


@router.get("/count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _sync_forecast_notifications(current_user, db)
    change_count = await db.scalar(select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read.is_(False),
    )) or 0
    forecast_count = await db.scalar(select(func.count()).where(
        ForecastNotification.user_id == current_user.id,
        ForecastNotification.is_read.is_(False),
    )) or 0
    return {"unread": change_count + forecast_count}
