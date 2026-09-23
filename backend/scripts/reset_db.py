import asyncio
import os
import sys

# Add parent directory (backend root) to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import engine, Base
from seed_catalog import seed

async def async_reset_db():
    print("Dropping all database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("Re-creating database schema...")
        await conn.run_sync(Base.metadata.create_all)

    print("Re-seeding initial API catalog...")
    await seed()
    print("Database reset complete")

if __name__ == "__main__":
    asyncio.run(async_reset_db())
