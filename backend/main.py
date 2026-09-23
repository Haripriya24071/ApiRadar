import os
import logging
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, stacks, changes, apis, notifications
from tasks.scraper_tasks import (
    run_all_scrapers,
    run_all_rss_scrapers,
    run_all_github_scrapers,
    scrape_single_api,
)

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
    logger.info("ApiRadar backend started successfully")

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "ApiRadar is alive"}

@app.get("/admin/test-task")
async def test_task():
    task = run_all_rss_scrapers.delay()
    return {"status": "task queued", "task_id": task.id}

@app.get("/admin/scrape/all")
async def trigger_all_scrapers():
    task = run_all_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.get("/admin/scrape/rss")
async def trigger_rss_scrapers():
    task = run_all_rss_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.get("/admin/scrape/github")
async def trigger_github_scrapers():
    task = run_all_github_scrapers.delay()
    return {"status": "queued", "task_id": task.id}

@app.get("/admin/scrape/{api_slug}")
async def trigger_single_api_scraper(api_slug: str):
    task = scrape_single_api.delay(api_slug)
    return {"status": "queued", "task_id": task.id}
