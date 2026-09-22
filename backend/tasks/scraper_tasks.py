import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from tasks.celery_app import celery_app
from database import SessionLocal
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent
from scrapers.rss_scraper import RSSScraper
from scrapers.github_scraper import GitHubReleaseScraper

async def _async_run_all_rss_scrapers():
    scrapers_run = 0
    changes_found = 0

    async with SessionLocal() as db:
        stmt = select(APICatalog).where(
            APICatalog.rss_feed_url.isnot(None),
            APICatalog.rss_feed_url != ""
        )
        res = await db.execute(stmt)
        apis = res.scalars().all()

        for api in apis:
            scraper = RSSScraper(api)
            changes = await scraper.run(db)
            scrapers_run += 1
            for change_data in changes:
                event = ChangeEvent(**change_data)
                db.add(event)
                changes_found += 1

            api.last_scraped_at = datetime.now(timezone.utc)

        await db.commit()

    return {"status": "ok", "scrapers_run": scrapers_run, "changes_found": changes_found}

async def _async_run_all_github_scrapers():
    scrapers_run = 0
    changes_found = 0

    async with SessionLocal() as db:
        stmt = select(APICatalog).where(
            APICatalog.github_repo.isnot(None),
            APICatalog.github_repo != ""
        )
        res = await db.execute(stmt)
        apis = res.scalars().all()

        for api in apis:
            scraper = GitHubReleaseScraper(api)
            changes = await scraper.run(db)
            scrapers_run += 1
            for change_data in changes:
                event = ChangeEvent(**change_data)
                db.add(event)
                changes_found += 1

            api.last_scraped_at = datetime.now(timezone.utc)

        await db.commit()

    return {"status": "ok", "scrapers_run": scrapers_run, "changes_found": changes_found}

@celery_app.task
def run_all_rss_scrapers():
    print("RSS scraper task triggered")
    return asyncio.run(_async_run_all_rss_scrapers())

@celery_app.task
def run_all_github_scrapers():
    print("GitHub scraper task triggered")
    return asyncio.run(_async_run_all_github_scrapers())
