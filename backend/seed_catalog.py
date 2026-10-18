import asyncio
from sqlalchemy import select
from database import SessionLocal, init_db
from models.api_catalog import APICatalog
from tasks.scraper_tasks import _async_run_all_rss_scrapers, _async_run_all_github_scrapers

INITIAL_APIS = [
    {
        "name": "Stripe",
        "slug": "stripe",
        "category": "payments",
        "changelog_url": "https://stripe.com/docs/changelog",
        "rss_feed_url": "https://stripe.com/docs/changelog.rss",
        "github_repo": "stripe/stripe-python",
        "openapi_spec_url": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
        "logo_url": "https://logo.clearbit.com/stripe.com",
    },
    {
        "name": "OpenAI",
        "slug": "openai",
        "category": "ai-ml",
        "changelog_url": "https://platform.openai.com/docs/changelog",
        "rss_feed_url": "https://openai.com/blog/rss.xml",
        "github_repo": "openai/openai-python",
        "openapi_spec_url": None,
        "logo_url": "https://logo.clearbit.com/openai.com",
    },
    {
        "name": "Groq",
        "slug": "groq",
        "category": "ai-ml",
        "changelog_url": "https://console.groq.com/docs/changelog",
        "rss_feed_url": None,
        "github_repo": "groq/groq-python",
        "openapi_spec_url": None,
        "logo_url": "https://logo.clearbit.com/groq.com",
    },
    {
        "name": "Supabase",
        "slug": "supabase",
        "category": "database",
        "changelog_url": "https://supabase.com/changelog",
        "rss_feed_url": "https://supabase.com/rss.xml",
        "github_repo": "supabase/supabase-js",
        "openapi_spec_url": None,
        "logo_url": "https://logo.clearbit.com/supabase.com",
    },
    {
        "name": "Twilio",
        "slug": "twilio",
        "category": "messaging",
        "changelog_url": "https://www.twilio.com/docs/changelog",
        "rss_feed_url": "https://www.twilio.com/blog/feed",
        "github_repo": "twilio/twilio-python",
        "openapi_spec_url": None,
        "logo_url": "https://logo.clearbit.com/twilio.com",
    },
    {
        "name": "GitHub",
        "slug": "github",
        "category": "devtools",
        "changelog_url": "https://github.blog/changelog/",
        "rss_feed_url": "https://github.blog/changelog/feed/",
        "github_repo": "octokit/octokit.js",
        "openapi_spec_url": "https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json",
        "logo_url": "https://logo.clearbit.com/github.com",
    },
    {
        "name": "SendGrid",
        "slug": "sendgrid",
        "category": "email",
        "changelog_url": "https://sendgrid.com/docs/release-notes/",
        "rss_feed_url": None,
        "github_repo": "sendgrid/sendgrid-python",
        "openapi_spec_url": None,
        "logo_url": "https://logo.clearbit.com/sendgrid.com",
    },
    {
        "name": "Google Gemini",
        "slug": "gemini",
        "category": "ai-ml",
        "changelog_url": "https://ai.google.dev/gemini-api/docs/changelog",
        "github_repo": "googleapis/python-genai",
        "logo_url": "https://logo.clearbit.com/google.com",
    },
    {
        "name": "Google Vertex AI",
        "slug": "vertex-ai",
        "category": "ai-ml",
        "changelog_url": "https://docs.cloud.google.com/vertex-ai/docs/release-notes",
        "rss_feed_url": "https://cloud.google.com/feeds/vertex-ai-product-group-release-notes.xml",
        "github_repo": "googleapis/python-aiplatform",
        "logo_url": "https://logo.clearbit.com/cloud.google.com",
    },
    {
        "name": "NewsAPI",
        "slug": "newsapi",
        "category": "data",
        "changelog_url": "https://newsapi.org/docs",
        "github_repo": "mattlisiv/newsapi-python",
        "logo_url": "https://logo.clearbit.com/newsapi.org",
    },
    {
        "name": "World Bank Open Data",
        "slug": "world-bank",
        "category": "data",
        "changelog_url": "https://datahelpdesk.worldbank.org/knowledgebase/topics/125589-developer-information",
        "logo_url": "https://logo.clearbit.com/worldbank.org",
    },
    {
        "name": "Crunchbase",
        "slug": "crunchbase",
        "category": "data",
        "changelog_url": "https://data.crunchbase.com/docs/using-the-api",
        "logo_url": "https://logo.clearbit.com/crunchbase.com",
    },
    {
        "name": "Google BigQuery",
        "slug": "bigquery",
        "category": "data",
        "changelog_url": "https://docs.cloud.google.com/bigquery/docs/release-notes",
        "github_repo": "googleapis/python-bigquery",
        "logo_url": "https://logo.clearbit.com/cloud.google.com",
    },
    {
        "name": "Google Cloud Storage",
        "slug": "cloud-storage",
        "category": "cloud",
        "changelog_url": "https://docs.cloud.google.com/storage/docs/release-notes",
        "github_repo": "googleapis/python-storage",
        "logo_url": "https://logo.clearbit.com/cloud.google.com",
    },
]

async def seed(skip_scrape: bool = False):
    await init_db()
    seeded_count = 0
    async with SessionLocal() as db:
        for api_data in INITIAL_APIS:
            result = await db.execute(
                select(APICatalog).where(APICatalog.slug == api_data["slug"])
            )
            existing = result.scalar_one_or_none()
            if not existing:
                api = APICatalog(**api_data)
                db.add(api)
                seeded_count += 1
            else:
                # Keep source metadata current as the built-in catalog evolves.
                for field, value in api_data.items():
                    if value is not None:
                        setattr(existing, field, value)
        await db.commit()

    if not skip_scrape:
        # Trigger immediate scrape for RSS and GitHub sources
        try:
            await _async_run_all_rss_scrapers()
            await _async_run_all_github_scrapers()
        except Exception as e:
            print(f"Notice: Initial scrape completed with message: {e}")

    suffix = "" if skip_scrape else " and triggered initial scrape"
    print(f"Seeded {seeded_count} APIs{suffix}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed the API catalog")
    parser.add_argument(
        "--skip-scrape",
        action="store_true",
        help="Seed catalog rows without contacting changelog or GitHub sources",
    )
    args = parser.parse_args()
    asyncio.run(seed(skip_scrape=args.skip_scrape))
