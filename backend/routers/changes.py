import uuid
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.user import User
from models.stack_profile import StackProfile, WatchedAPI
from models.change_event import ChangeEvent
from models.api_catalog import APICatalog
from dependencies import get_current_user

router = APIRouter(prefix="/changes", tags=["changes"])

class APIBaseResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    category: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class ChangeEventResponse(BaseModel):
    id: uuid.UUID
    api_id: uuid.UUID
    source: str
    severity: str
    title: str
    what_changed: Optional[str] = None
    affected_endpoints: Optional[List[str]] = []
    deadline_date: Optional[date] = None
    migration_summary: Optional[str] = None
    effort_estimate: Optional[str] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    api: APIBaseResponse

    class Config:
        from_attributes = True

class PaginatedChangesResponse(BaseModel):
    items: List[ChangeEventResponse]
    total: int
    page: int
    page_size: int

@router.get("", response_model=PaginatedChangesResponse)
async def get_changes(
    severity: Optional[str] = Query(None),
    api_slug: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt_watched = (
        select(WatchedAPI.api_id)
        .join(StackProfile, WatchedAPI.profile_id == StackProfile.id)
        .where(StackProfile.user_id == current_user.id)
    )
    res_watched = await db.execute(stmt_watched)
    watched_api_ids = list(res_watched.scalars().all())

    if not watched_api_ids:
        return PaginatedChangesResponse(items=[], total=0, page=page, page_size=page_size)

    query = (
        select(ChangeEvent)
        .where(ChangeEvent.api_id.in_(watched_api_ids))
        .options(selectinload(ChangeEvent.api))
    )

    if severity:
        query = query.where(ChangeEvent.severity == severity.upper())

    if api_slug:
        query = query.join(APICatalog, ChangeEvent.api_id == APICatalog.id).where(APICatalog.slug == api_slug)

    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    query = query.order_by(ChangeEvent.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    items_res = await db.execute(query)
    items = items_res.scalars().all()

    return PaginatedChangesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size
    )

@router.get("/critical", response_model=List[ChangeEventResponse])
async def get_critical_changes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt_watched = (
        select(WatchedAPI.api_id)
        .join(StackProfile, WatchedAPI.profile_id == StackProfile.id)
        .where(StackProfile.user_id == current_user.id)
    )
    res_watched = await db.execute(stmt_watched)
    watched_api_ids = list(res_watched.scalars().all())

    if not watched_api_ids:
        return []

    stmt = (
        select(ChangeEvent)
        .where(
            ChangeEvent.api_id.in_(watched_api_ids),
            ChangeEvent.severity == "CRITICAL"
        )
        .options(selectinload(ChangeEvent.api))
        .order_by(ChangeEvent.created_at.desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{change_id}", response_model=ChangeEventResponse)
async def get_change_by_id(
    change_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(ChangeEvent)
        .where(ChangeEvent.id == change_id)
        .options(selectinload(ChangeEvent.api))
    )
    res = await db.execute(stmt)
    change = res.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change event not found")
    return change
