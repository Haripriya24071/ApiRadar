import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from database import get_db
from models.user import User
from models.stack_profile import StackProfile, WatchedAPI
from models.api_catalog import APICatalog
from dependencies import get_current_user
from services.package_parser import parse_package_json, match_apis_to_catalog

router = APIRouter(prefix="/stacks", tags=["stacks"])

class StackCreate(BaseModel):
    name: str = "My Stack"

class WatchAPIRequest(BaseModel):
    api_id: uuid.UUID
    sdk_version: Optional[str] = None

class ParsePackageRequest(BaseModel):
    package_json: dict

class APIBaseResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    category: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True

class WatchedAPIResponse(BaseModel):
    id: uuid.UUID
    api_id: uuid.UUID
    sdk_version: Optional[str] = None
    api: APIBaseResponse

    class Config:
        from_attributes = True

class StackResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    watched_apis: List[WatchedAPIResponse] = []

    class Config:
        from_attributes = True

class ParsedAPIMatchResponse(BaseModel):
    api: APIBaseResponse
    sdk_version: Optional[str] = None
    already_watching: bool

@router.get("", response_model=List[StackResponse])
async def get_user_stacks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(StackProfile)
        .where(StackProfile.user_id == current_user.id)
        .options(selectinload(StackProfile.watched_apis).selectinload(WatchedAPI.api))
    )
    result = await db.execute(stmt)
    stacks = result.scalars().all()
    return stacks

@router.post("", response_model=StackResponse, status_code=status.HTTP_201_CREATED)
async def create_stack(
    req: StackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_stack = StackProfile(
        user_id=current_user.id,
        name=req.name
    )
    db.add(new_stack)
    await db.commit()
    
    stmt = (
        select(StackProfile)
        .where(StackProfile.id == new_stack.id)
        .options(selectinload(StackProfile.watched_apis).selectinload(WatchedAPI.api))
    )
    res = await db.execute(stmt)
    return res.scalar_one()

@router.delete("/{stack_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stack(
    stack_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(StackProfile).where(
            StackProfile.id == stack_id,
            StackProfile.user_id == current_user.id
        )
    )
    stack = result.scalar_one_or_none()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack profile not found")
        
    await db.delete(stack)
    await db.commit()
    return None

@router.post("/{stack_id}/watch", response_model=WatchedAPIResponse, status_code=status.HTTP_201_CREATED)
async def watch_api(
    stack_id: uuid.UUID,
    req: WatchAPIRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(StackProfile).where(
            StackProfile.id == stack_id,
            StackProfile.user_id == current_user.id
        )
    )
    stack = result.scalar_one_or_none()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack profile not found")

    api_res = await db.execute(select(APICatalog).where(APICatalog.id == req.api_id))
    api_item = api_res.scalar_one_or_none()
    if not api_item:
        raise HTTPException(status_code=404, detail="API not found in catalog")

    existing_res = await db.execute(
        select(WatchedAPI).where(
            WatchedAPI.profile_id == stack_id,
            WatchedAPI.api_id == req.api_id
        ).options(selectinload(WatchedAPI.api))
    )
    existing_watch = existing_res.scalar_one_or_none()
    if existing_watch:
        if req.sdk_version:
            existing_watch.sdk_version = req.sdk_version
            await db.commit()
            await db.refresh(existing_watch)
        return existing_watch

    new_watch = WatchedAPI(
        profile_id=stack_id,
        api_id=req.api_id,
        sdk_version=req.sdk_version
    )
    db.add(new_watch)
    await db.commit()
    
    watch_res = await db.execute(
        select(WatchedAPI)
        .where(WatchedAPI.id == new_watch.id)
        .options(selectinload(WatchedAPI.api))
    )
    return watch_res.scalar_one()

@router.delete("/{stack_id}/watch/{api_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unwatch_api(
    stack_id: uuid.UUID,
    api_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(StackProfile).where(
            StackProfile.id == stack_id,
            StackProfile.user_id == current_user.id
        )
    )
    stack = result.scalar_one_or_none()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack profile not found")

    await db.execute(
        delete(WatchedAPI).where(
            WatchedAPI.profile_id == stack_id,
            WatchedAPI.api_id == api_id
        )
    )
    await db.commit()
    return None

@router.post("/{stack_id}/parse", response_model=List[ParsedAPIMatchResponse])
async def parse_package(
    stack_id: uuid.UUID,
    req: ParsePackageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(StackProfile)
        .where(
            StackProfile.id == stack_id,
            StackProfile.user_id == current_user.id
        )
        .options(selectinload(StackProfile.watched_apis))
    )
    stack = result.scalar_one_or_none()
    if not stack:
        raise HTTPException(status_code=404, detail="Stack profile not found")

    watched_api_ids = {w.api_id for w in stack.watched_apis}

    catalog_res = await db.execute(select(APICatalog))
    catalog_apis = catalog_res.scalars().all()

    packages = parse_package_json(req.package_json)
    matched = match_apis_to_catalog(packages, catalog_apis)

    response = []
    for item in matched:
        api_obj = item["api"]
        sdk_ver = item["sdk_version"]
        response.append(
            ParsedAPIMatchResponse(
                api=APIBaseResponse.model_validate(api_obj),
                sdk_version=sdk_ver,
                already_watching=(api_obj.id in watched_api_ids)
            )
        )
    return response
