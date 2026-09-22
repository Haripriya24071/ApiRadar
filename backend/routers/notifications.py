import uuid
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from database import get_db
from models.user import User
from models.notification import Notification
from models.change_event import ChangeEvent
from dependencies import get_current_user
from routers.changes import ChangeEventResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: uuid.UUID
    is_read: bool
    created_at: datetime
    change_event: ChangeEventResponse

    class Config:
        from_attributes = True

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    unread_stmt = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    unread_res = await db.execute(unread_stmt)
    unread_count = unread_res.scalar() or 0

    response.headers["X-Unread-Count"] = str(unread_count)

    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .options(selectinload(Notification.change_event).selectinload(ChangeEvent.api))
        .order_by(Notification.created_at.desc())
        .limit(20)
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.patch("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False
        )
        .values(is_read=True)
    )
    res = await db.execute(stmt)
    await db.commit()
    return {"updated": res.rowcount}

@router.get("/count")
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(func.count()).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    )
    res = await db.execute(stmt)
    count = res.scalar() or 0
    return {"unread": count}
