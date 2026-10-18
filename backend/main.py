import os
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db
from database import SessionLocal
from sqlalchemy import select
from models.change_event import ChangeEvent
from routers import auth, stacks, changes, apis, notifications
from dependencies import require_admin_key
from tasks.scraper_tasks import (
    run_all_scrapers,
    run_all_rss_scrapers,
    run_all_github_scrapers,
    scrape_single_api,
    _async_run_all_rss_scrapers,
    _async_run_all_github_scrapers,
    _async_run_all_changelog_pages,
)
from tasks.diff_tasks import _async_run_all_openapi_diffs
from seed_catalog import seed as seed_catalog
from services.content_sanitizer import clean_source_text, classify_change_severity, improve_rss_title

# Configure logging to console and file
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/apiradar.log", encoding="utf-8")
    ]
)
logger = logging.getLogger("apiradar")

app = FastAPI(
    title="ApiRadar API",
    version="1.0.0"
)

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": detail, "status_code": exc.status_code}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed",
            "details": exc.errors(),
            "status_code": 422
        }
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "status_code": 500}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(stacks.router, prefix="/api")
app.include_router(changes.router, prefix="/api")
app.include_router(apis.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    await init_db()
    await seed_catalog(skip_scrape=True)
    await _normalize_existing_change_events()
    app.state.scheduler_task = None
    app.state.scheduler_status = {
        "enabled": settings.INLINE_MONITORING_ENABLED,
        "last_scrape_at": None,
        "last_openapi_diff_at": None,
        "last_error": None,
    }
    if settings.INLINE_MONITORING_ENABLED:
        app.state.scheduler_task = asyncio.create_task(_run_inline_scheduler())
    logger.info("ApiRadar backend started successfully")

async def _normalize_existing_change_events():
    """Clean legacy scrape payloads and recheck auto-classified source severity."""
    async with SessionLocal() as db:
        result = await db.execute(select(ChangeEvent).where(
            ChangeEvent.source.in_(["rss", "github_release"])
        ))
        for event in result.scalars().all():
            previous_title = event.title
            previous_summary = event.what_changed
            previous_migration = event.migration_summary
            event.title = clean_source_text(event.title)[:500] or "Provider update"
            event.what_changed = clean_source_text(event.what_changed)[:5000] or None
            event.migration_summary = clean_source_text(event.migration_summary)[:5000] or None
            if event.source == "rss":
                event.title = improve_rss_title(event.title, event.what_changed or "")
            event.severity = classify_change_severity(
                "\n".join((event.title, event.what_changed or "", event.raw_content or "")),
                event.severity,
            )
            if (event.title, event.what_changed, event.migration_summary) != (
                previous_title, previous_summary, previous_migration
            ):
                db.add(event)
        await db.commit()

async def _run_inline_scheduler():
    """Local development scheduler; Docker uses the dedicated Celery beat service."""
    status = app.state.scheduler_status
    await asyncio.sleep(2)
    next_openapi_diff = asyncio.get_running_loop().time()
    while True:
        try:
            # Run one database-writing scraper at a time; this also avoids
            # SQLite write-lock contention in local development.
            results = []
            for scraper in (
                _async_run_all_rss_scrapers,
                _async_run_all_github_scrapers,
                _async_run_all_changelog_pages,
            ):
                try:
                    results.append(await scraper())
                except Exception as exc:
                    results.append(exc)
            errors = [str(result) for result in results if isinstance(result, Exception)]
            errors.extend(
                f"source group {index + 1}: {result['scrapers_failed']} source(s) failed"
                for index, result in enumerate(results)
                if isinstance(result, dict) and result.get("scrapers_failed", 0)
            )
            status["last_scrape_at"] = datetime.now(timezone.utc).isoformat()
            status["last_error"] = "; ".join(errors) if errors else None
            logger.info("Inline scrape cycle completed: %s", results)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            status["last_error"] = str(exc)
            logger.exception("Inline scrape cycle failed")
        loop = asyncio.get_running_loop()
        if loop.time() >= next_openapi_diff:
            try:
                openapi_result = await _async_run_all_openapi_diffs()
                status["last_openapi_diff_at"] = datetime.now(timezone.utc).isoformat()
                if openapi_result.get("apis_failed"):
                    status["last_error"] = f"{openapi_result['apis_failed']} OpenAPI source(s) failed"
                next_openapi_diff = loop.time() + max(60, settings.OPENAPI_INTERVAL_SECONDS)
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                status["last_error"] = str(exc)
                logger.exception("Inline OpenAPI diff failed")
        await asyncio.sleep(max(60, settings.SCRAPE_INTERVAL_SECONDS))

@app.on_event("shutdown")
async def shutdown_event():
    task = getattr(app.state, "scheduler_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "ApiRadar is alive"}

@app.get("/api/monitoring/status")
async def monitoring_status():
    return getattr(app.state, "scheduler_status", {"enabled": False})

@app.post("/admin/test-task", dependencies=[Depends(require_admin_key)])
async def test_task():
    task = run_all_rss_scrapers.delay()
    return {"status": "task queued", "task_id": task.id}

@app.post("/admin/scrape/all", dependencies=[Depends(require_admin_key)])
async def trigger_all_scrapers():
    task = run_all_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.post("/admin/scrape/rss", dependencies=[Depends(require_admin_key)])
async def trigger_rss_scrapers():
    task = run_all_rss_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.post("/admin/scrape/github", dependencies=[Depends(require_admin_key)])
async def trigger_github_scrapers():
    task = run_all_github_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.post("/admin/scrape/{api_slug}", dependencies=[Depends(require_admin_key)])
async def trigger_single_api_scraper(api_slug: str):
    task = scrape_single_api.delay(api_slug)
    return {"status": "queued", "task_id": task.id}
