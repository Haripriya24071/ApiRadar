import time
from datetime import datetime, timezone
from typing import List, Optional
import feedparser
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.change_event import ChangeEvent
from scrapers.base import BaseScraper, RawChange

def _struct_time_to_datetime(st) -> Optional[datetime]:
    if not st:
        return None
    try:
        return datetime.fromtimestamp(time.mktime(st), tz=timezone.utc)
    except Exception:
        return None

class RSSScraper(BaseScraper):
    async def fetch(self, db: AsyncSession) -> List[RawChange]:
        if not self.api.rss_feed_url:
            return []

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(self.api.rss_feed_url)
                response.raise_for_status()
                feed_text = response.text
        except Exception as e:
            print(f"Error fetching RSS feed for {self.api.name} ({self.api.rss_feed_url}): {e}")
            return []

        feed = feedparser.parse(feed_text)
        entries = feed.entries[:20] if feed.entries else []
        raw_changes = []

        for entry in entries:
            link = entry.get("link") or entry.get("id") or ""
            title = entry.get("title", "Untitled Change")
            content = entry.get("summary") or entry.get("description") or title
            published_parsed = entry.get("published_parsed") or entry.get("updated_parsed")
            published_at = _struct_time_to_datetime(published_parsed)

            if link:
                stmt = select(ChangeEvent).where(
                    ChangeEvent.api_id == self.api.id,
                    ChangeEvent.raw_content.contains(link)
                )
                res = await db.execute(stmt)
                if res.scalar_one_or_none():
                    continue

            raw_changes.append(
                RawChange(
                    source="rss",
                    title=title,
                    content=content,
                    url=link,
                    published_at=published_at,
                    api_id=self.api.id,
                    api_name=self.api.name
                )
            )

        return raw_changes
