from datetime import datetime, timezone
from typing import List, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.change_event import ChangeEvent
from scrapers.base import BaseScraper, RawChange

def _parse_iso_datetime(dt_str: Optional[str]) -> Optional[datetime]:
    if not dt_str:
        return None
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None

class GitHubReleaseScraper(BaseScraper):
    async def fetch(self, db: AsyncSession) -> List[RawChange]:
        if not self.api.github_repo:
            return []

        repo = self.api.github_repo.strip()
        url = f"https://api.github.com/repos/{repo}/releases"
        
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "ApiRadar-Scraper",
        }
        if settings.GITHUB_TOKEN and not settings.GITHUB_TOKEN.startswith("ghp_..."):
            headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 404:
                    print(f"GitHub repository not found: {repo}")
                    return []
                elif response.status_code == 403:
                    print(f"GitHub API rate limit exceeded or forbidden for repo: {repo}")
                    return []
                response.raise_for_status()
                releases = response.json()
        except Exception as e:
            print(f"Error fetching GitHub releases for {self.api.name} ({repo}): {e}")
            return []

        if not isinstance(releases, list):
            return []

        recent_releases = releases[:10]
        raw_changes = []

        for release in recent_releases:
            if release.get("draft") or release.get("prerelease"):
                continue

            pub_str = release.get("published_at")
            published_at = _parse_iso_datetime(pub_str)

            if published_at and self.api.last_scraped_at:
                last_scraped = self.api.last_scraped_at
                if last_scraped.tzinfo is None:
                    last_scraped = last_scraped.replace(tzinfo=timezone.utc)
                if published_at <= last_scraped:
                    continue

            html_url = release.get("html_url") or ""
            title = release.get("name") or release.get("tag_name") or f"{self.api.name} Release"
            body = release.get("body") or title

            if html_url:
                stmt = select(ChangeEvent).where(
                    ChangeEvent.api_id == self.api.id,
                    ChangeEvent.raw_content.contains(html_url)
                )
                res = await db.execute(stmt)
                if res.scalar_one_or_none():
                    continue

            raw_changes.append(
                RawChange(
                    source="github_release",
                    title=title,
                    content=body,
                    url=html_url,
                    published_at=published_at,
                    api_id=self.api.id,
                    api_name=self.api.name
                )
            )

        return raw_changes
