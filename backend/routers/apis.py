import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from database import get_db
from models.api_catalog import APICatalog
from models.change_event import ChangeEvent
from routers.changes import ChangeEventResponse

router = APIRouter(prefix="/apis", tags=["apis"])

class APICatalogResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    category: Optional[str] = None
    changelog_url: Optional[str] = None
    logo_url: Optional[str] = None
    last_scraped_at: Optional[datetime] = None
    github_repo: Optional[str] = None
    openapi_spec_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class APIDetailResponse(APICatalogResponse):
    recent_changes: List[ChangeEventResponse] = []

@router.get("", response_model=List[APICatalogResponse])
async def get_all_apis(db: AsyncSession = Depends(get_db)):
    stmt = select(APICatalog).order_by(APICatalog.name)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/search", response_model=List[APICatalogResponse])
async def search_apis(q: str = Query(""), db: AsyncSession = Depends(get_db)):
    if not q.strip():
        return await get_all_apis(db)
    stmt = select(APICatalog).where(APICatalog.name.ilike(f"%{q.strip()}%")).order_by(APICatalog.name)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{slug}", response_model=APIDetailResponse)
async def get_api_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    stmt = select(APICatalog).where(APICatalog.slug == slug)
    res = await db.execute(stmt)
    api = res.scalar_one_or_none()
    if not api:
        raise HTTPException(status_code=404, detail="API not found in catalog")

    changes_stmt = (
        select(ChangeEvent)
        .where(ChangeEvent.api_id == api.id)
        .options(selectinload(ChangeEvent.api))
        .order_by(ChangeEvent.created_at.desc())
        .limit(5)
    )
    changes_res = await db.execute(changes_stmt)
    recent_changes = changes_res.scalars().all()

    detail = APIDetailResponse.model_validate(api)
    detail.recent_changes = [ChangeEventResponse.model_validate(c) for c in recent_changes]
    return detail
