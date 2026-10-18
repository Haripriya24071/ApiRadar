import hashlib
import re
from datetime import datetime, timezone
from html.parser import HTMLParser
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.api_catalog import APICatalog
from models.changelog_snapshot import ChangelogSnapshot


class _VisibleText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript", "svg", "nav", "footer", "header"}:
            self.hidden += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript", "svg", "nav", "footer", "header"} and self.hidden:
            self.hidden -= 1

    def handle_data(self, data):
        if not self.hidden:
            text = re.sub(r"\s+", " ", data).strip()
            if text:
                self.parts.append(text)


async def scrape_changelog_page(api: APICatalog, db: AsyncSession) -> list[dict[str, Any]]:
    """Track visible docs text as a low-frequency fallback where no feed exists."""
    if not api.changelog_url:
        return []
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, headers={
            "User-Agent": "ApiRadar/1.0 (+https://github.com/Haripriya24071/ApiRadar)"
        }) as client:
            response = await client.get(api.changelog_url)
            response.raise_for_status()
            parser = _VisibleText()
            parser.feed(response.text[:2_000_000])
            content = " ".join(parser.parts)[:100_000]
    except Exception as exc:
        raise RuntimeError(f"Could not fetch {api.changelog_url}: {exc}") from exc

    if len(content) < 200:
        return []
    digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
    result = await db.execute(select(ChangelogSnapshot).where(ChangelogSnapshot.api_id == api.id))
    snapshot = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if snapshot is None:
        db.add(ChangelogSnapshot(api_id=api.id, source_url=api.changelog_url, content_hash=digest, content=content))
        api.last_scraped_at = now
        await db.commit()
        return []
    if snapshot.source_url == api.changelog_url and snapshot.content_hash == digest:
        snapshot.fetched_at = now
        api.last_scraped_at = now
        await db.commit()
        return []

    # Keep the diff focused: include only new text fragments and cap stored payload.
    old_parts = set(snapshot.content.split(". "))
    additions = [part for part in content.split(". ") if part not in old_parts]
    summary = ". ".join(additions)[:5000] or "The provider's changelog page was updated."
    snapshot.source_url = api.changelog_url
    snapshot.content_hash = digest
    snapshot.content = content
    snapshot.fetched_at = now
    api.last_scraped_at = now
    await db.commit()
    return [{
        "api_id": api.id,
        "source": "changelog_page",
        "severity": "INFO",
        "title": f"{api.name} documentation updated",
        "what_changed": summary,
        "affected_endpoints": [],
        "migration_summary": "Review the provider's official changelog for details.",
        "effort_estimate": "Review",
        "raw_content": f"{api.changelog_url}\n{summary}"[:5000],
        "published_at": now,
    }]
