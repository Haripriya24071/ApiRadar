from celery import Celery
from celery.schedules import crontab
from config import settings

celery_app = Celery(
    "apiradar",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "tasks.scraper_tasks",
        "tasks.diff_tasks",
        "tasks.email_tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "run-all-scrapers-every-6-hours": {
            "task": "tasks.scraper_tasks.run_all_scrapers",
            "schedule": 21600.0,
        },
        "diff-openapi-daily": {
            "task": "tasks.diff_tasks.run_all_openapi_diffs",
            "schedule": 86400.0,
        },
        "send-digest-daily": {
            "task": "tasks.email_tasks.send_daily_digests",
            "schedule": crontab(hour=8, minute=0),
        },
    },
)
