import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base

class UserResolvedChange(Base):
    __tablename__ = "user_resolved_changes"
    __table_args__ = (
        UniqueConstraint("user_id", "change_event_id", name="uq_user_resolved_change"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    change_event_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("change_events.id", ondelete="CASCADE"), nullable=False)
    resolved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User")
    change_event: Mapped["ChangeEvent"] = relationship("ChangeEvent")
