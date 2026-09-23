import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from tasks.celery_app import celery_app
from database import SessionLocal
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent
from scrapers.rss_scraper import RSSScraper
from scrapers.github_scraper import GitHubReleaseScraper
from services.notification_service import create_notifications_for_change

async def _async_run_all_rss_scrapers():
    scrapers_run = 0
    total_changes = 0

    async with SessionLocal() as db:
        stmt = select(APICatalog).where(
            APICatalog.rss_feed_url.isnot(None),
            APICatalog.rss_feed_url != ""
        )
        res = await db.execute(stmt)
        apis = res.scalars().all()

        for api in apis:
            try:
                scraper = RSSScraper(api)
                changes = await scraper.run(db)
                scrapers_run += 1
                for change_data in changes:
                    event = ChangeEvent(**change_data)
                    db.add(event)
                    await db.commit()
                    await create_notifications_for_change(event, db)
                    total_changes += 1

                api.last_scraped_at = datetime.now(timezone.utc)
            except Exception as e:
                print(f"Error running RSS scraper for API {api.slug}: {e}")

        await db.commit()

    return {"status": "ok", "scrapers_run": scrapers_run, "changes_found": total_changes}

async def _async_run_all_github_scrapers():
    scrapers_run = 0
    total_changes = 0

    async with SessionLocal() as db:
        stmt = select(APICatalog).where(
            APICatalog.github_repo.isnot(None),
            APICatalog.github_repo != ""
        )
        res = await db.execute(stmt)
        apis = res.scalars().all()

        for api in apis:
            try:
                scraper = GitHubReleaseScraper(api)
                changes = await scraper.run(db)
                scrapers_run += 1
                for change_data in changes:
                    event = ChangeEvent(**change_data)
                    db.add(event)
                    await db.commit()
                    await create_notifications_for_change(event, db)
                    total_changes += 1

                api.last_scraped_at = datetime.now(timezone.utc)
            except Exception as e:
                print(f"Error running GitHub scraper for API {api.slug}: {e}")

        await db.commit()

    return {"status": "ok", "scrapers_run": scrapers_run, "changes_found": total_changes}

async def _async_scrape_single_api(api_slug: str):
    total_changes = 0
    async with SessionLocal() as db:
        res = await db.execute(select(APICatalog).where(APICatalog.slug == api_slug))
        api = res.scalar_one_or_none()
        if not api:
            return {"status": "error", "message": f"API {api_slug} not found"}

        if api.rss_feed_url:
            try:
                rss_scraper = RSSScraper(api)
                rss_changes = await rss_scraper.run(db)
                for change_data in rss_changes:
                    event = ChangeEvent(**change_data)
                    db.add(event)
                    await db.commit()
                    await create_notifications_for_change(event, db)
                    total_changes += 1
            except Exception as e:
                print(f"Error in single RSS scrape for {api_slug}: {e}")

        if api.github_repo:
            try:
                gh_scraper = GitHubReleaseScraper(api)
                gh_changes = await gh_scraper.run(db)
                for change_data in gh_changes:
                    event = ChangeEvent(**change_data)
                    db.add(event)
                    await db.commit()
                    await create_notifications_for_change(event, db)
                    total_changes += 1
            except Exception as e:
                print(f"Error in single GitHub scrape for {api_slug}: {e}")

        api.last_scraped_at = datetime.now(timezone.utc)
        await db.commit()

    return {"status": "ok", "api": api_slug, "changes_found": total_changes}

@celery_app.task
def run_all_rss_scrapers():
    print("RSS scraper task triggered")
    try:
        return asyncio.run(_async_run_all_rss_scrapers())
    except Exception as e:
        print(f"Fatal error in run_all_rss_scrapers: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task
def run_all_github_scrapers():
    print("GitHub scraper task triggered")
    try:
        return asyncio.run(_async_run_all_github_scrapers())
    except Exception as e:
        print(f"Fatal error in run_all_github_scrapers: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task
def run_all_scrapers():
    print("Run all scrapers combined task triggered")
    rss_task = run_all_rss_scrapers.delay()
    gh_task = run_all_github_scrapers.delay()
    return {
        "status": "both scraper tasks queued",
        "rss_task_id": rss_task.id,
        "github_task_id": gh_task.id
    }

@celery_app.task
def scrape_single_api(api_slug: str):
    print(f"Single API scraper task triggered for {api_slug}")
    try:
        return asyncio.run(_async_scrape_single_api(api_slug))
    except Exception as e:
        print(f"Fatal error in scrape_single_api({api_slug}): {e}")
        return {"status": "error", "message": str(e)}
