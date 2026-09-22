from tasks.celery_app import celery_app

@celery_app.task
def run_all_openapi_diffs():
    print("OpenAPI diff task triggered")
    return {"status": "ok"}
