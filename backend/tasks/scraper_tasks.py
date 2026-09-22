from tasks.celery_app import celery_app

@celery_app.task
def run_all_rss_scrapers():
    print("RSS scraper task triggered")
    return {"status": "ok", "scrapers_run": 0}

@celery_app.task
def run_all_github_scrapers():
    print("GitHub scraper task triggered")
    return {"status": "ok", "scrapers_run": 0}
