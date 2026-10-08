import asyncio
from datetime import datetime, date, timedelta, timezone
from sqlalchemy import select
from database import SessionLocal, init_db
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent

SAMPLE_CHANGES = [
    {
        "api_slug": "stripe",
        "source": "rss",
        "severity": "CRITICAL",
        "title": "Stripe Charges API v1 Sunset & Mandatory PaymentIntents Migration",
        "what_changed": "Legacy /v1/charges direct endpoint will return HTTP 410 Gone starting next quarter. All integrations must migrate to /v1/payment_intents with automatic 3D Secure 2 authentication.",
        "affected_endpoints": ["/v1/charges", "/v1/tokens", "/v1/sources"],
        "deadline_date": date.today() + timedelta(days=28),
        "migration_summary": "Replace direct charges API calls with PaymentIntent create and confirm flow.",
        "effort_estimate": "2-3 days",
    },
    {
        "api_slug": "openai",
        "source": "rss",
        "severity": "CRITICAL",
        "title": "OpenAI Completions Endpoint Deprecation (text-davinci-003 Sunset)",
        "what_changed": "The legacy /v1/completions endpoint for text-davinci models is being fully retired. Requests will receive HTTP 404. Migrate all prompt workflows to /v1/chat/completions or GPT-4o.",
        "affected_endpoints": ["/v1/completions"],
        "deadline_date": date.today() + timedelta(days=14),
        "migration_summary": "Switch model to gpt-4o-mini or gpt-3.5-turbo and update request payload to messages array format.",
        "effort_estimate": "1 day",
    },
    {
        "api_slug": "github",
        "source": "github",
        "severity": "WARNING",
        "title": "GitHub REST API OAuth Token Header Requirement Update",
        "what_changed": "Passing access tokens via query string (?access_token=...) is permanently removed. Authentication must strictly use Authorization: Bearer <token> header.",
        "affected_endpoints": ["/user", "/repos", "/orgs"],
        "deadline_date": date.today() + timedelta(days=45),
        "migration_summary": "Audit all API clients and SDK wrappers to verify tokens are sent in standard Authorization HTTP header.",
        "effort_estimate": "2 hours",
    },
    {
        "api_slug": "supabase",
        "source": "rss",
        "severity": "WARNING",
        "title": "Supabase Auth Schema Migration to GoTrue v2.0",
        "what_changed": "auth.users table column email_change_token is replaced by verification_token. Direct SQL queries referencing legacy column will fail.",
        "affected_endpoints": ["auth.users", "/auth/v1/verify"],
        "deadline_date": date.today() + timedelta(days=60),
        "migration_summary": "Update custom triggers or database functions querying auth schema directly.",
        "effort_estimate": "4 hours",
    },
    {
        "api_slug": "twilio",
        "source": "rss",
        "severity": "INFO",
        "title": "Twilio Programmable Messaging API New Optional StatusCallback Parameter",
        "what_changed": "Added support for delivery_receipt_format parameter in SMS dispatch API to receive enhanced cellular carrier diagnostic codes.",
        "affected_endpoints": ["/2010-04-01/Accounts/{AccountSid}/Messages.json"],
        "deadline_date": None,
        "migration_summary": "Optional upgrade: pass delivery_receipt_format=detailed for granular delivery diagnostics.",
        "effort_estimate": "30 mins",
    },
    {
        "api_slug": "sendgrid",
        "source": "github",
        "severity": "INFO",
        "title": "SendGrid Mail Send API v3 Dynamic Template Engine Version Bump",
        "what_changed": "Upgraded Handlebars template engine parser supporting advanced iteration helper loops and conditional fallbacks.",
        "affected_endpoints": ["/v3/mail/send"],
        "deadline_date": None,
        "migration_summary": "No action required for existing templates; new template syntax is backward compatible.",
        "effort_estimate": "None",
    },
]

async def seed_events():
    await init_db()
    async with SessionLocal() as db:
        res = await db.execute(select(APICatalog))
        apis = {api.slug: api for api in res.scalars().all()}

        count = 0
        for sample in SAMPLE_CHANGES:
            slug = sample["api_slug"]
            if slug not in apis:
                continue
            api = apis[slug]

            # Check if event already exists
            existing_res = await db.execute(
                select(ChangeEvent).where(
                    ChangeEvent.api_id == api.id,
                    ChangeEvent.title == sample["title"],
                )
            )
            if not existing_res.scalar_one_or_none():
                event = ChangeEvent(
                    api_id=api.id,
                    source=sample["source"],
                    severity=sample["severity"],
                    title=sample["title"],
                    what_changed=sample["what_changed"],
                    affected_endpoints=sample["affected_endpoints"],
                    deadline_date=sample["deadline_date"],
                    migration_summary=sample["migration_summary"],
                    effort_estimate=sample["effort_estimate"],
                    raw_content=sample["what_changed"],
                    published_at=datetime.now(timezone.utc),
                )
                db.add(event)
                count += 1

        await db.commit()
        print(f"Successfully seeded {count} sample change events!")

if __name__ == "__main__":
    asyncio.run(seed_events())
