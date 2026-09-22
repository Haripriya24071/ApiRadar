import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from tasks.celery_app import celery_app
from database import SessionLocal
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent
from diff.openapi_differ import diff_api_spec

async def _async_run_all_openapi_diffs():
    apis_diffed = 0
    total_changes = 0

    async with SessionLocal() as db:
        stmt = select(APICatalog).where(
            APICatalog.openapi_spec_url.isnot(None),
            APICatalog.openapi_spec_url != ""
        )
        res = await db.execute(stmt)
        apis = res.scalars().all()

        for api in apis:
            try:
                changes = await diff_api_spec(api, db)
                apis_diffed += 1
                for change_data in changes:
                    event = ChangeEvent(**change_data)
                    db.add(event)
                    total_changes += 1
            except Exception as e:
                print(f"Error running OpenAPI diff for API {api.slug}: {e}")

        await db.commit()

    return {"status": "ok", "apis_diffed": apis_diffed, "changes_found": total_changes}

@celery_app.task
def run_all_openapi_diffs():
    print("OpenAPI diff task triggered")
    try:
        return asyncio.run(_async_run_all_openapi_diffs())
    except Exception as e:
        print(f"Fatal error in run_all_openapi_diffs: {e}")
        return {"status": "error", "message": str(e)}
