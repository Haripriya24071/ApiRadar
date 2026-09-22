from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import auth, stacks, changes, apis, notifications
from tasks.scraper_tasks import run_all_rss_scrapers

app = FastAPI(
    title="ApiRadar API",
    version="1.0.0"
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
    print("ApiRadar backend started")

@app.get("/ping")
async def ping():
    return {"status": "ok", "message": "ApiRadar is alive"}

@app.get("/admin/test-task")
async def test_task():
    task = run_all_rss_scrapers.delay()
    return {"status": "task queued", "task_id": task.id}
