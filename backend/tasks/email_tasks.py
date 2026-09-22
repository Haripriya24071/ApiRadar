from tasks.celery_app import celery_app

@celery_app.task
def send_daily_digests():
    print("Email digest task triggered")
    return {"status": "ok"}
