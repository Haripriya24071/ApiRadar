from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.change_event import ChangeEvent
from models.notification import Notification
from models.stack_profile import StackProfile, WatchedAPI

async def create_notifications_for_change(change: ChangeEvent, db: AsyncSession) -> List[Notification]:
    """
    Finds all users who watch the API associated with the given ChangeEvent
    and creates a Notification record for each watching user.
    """
    stmt = (
        select(StackProfile.user_id)
        .join(WatchedAPI, WatchedAPI.profile_id == StackProfile.id)
        .where(WatchedAPI.api_id == change.api_id)
        .distinct()
    )
    res = await db.execute(stmt)
    user_ids = list(res.scalars().all())

    if not user_ids:
        return []

    notifications = [
        Notification(
            user_id=uid,
            change_event_id=change.id,
            is_read=False
        )
        for uid in user_ids
    ]

    db.add_all(notifications)
    await db.commit()
    return notifications
