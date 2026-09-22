import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class StackProfile(Base):
    __tablename__ = "stack_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="My Stack", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    watched_apis: Mapped[List["WatchedAPI"]] = relationship("WatchedAPI", back_populates="profile", cascade="all, delete-orphan")

class WatchedAPI(Base):
    __tablename__ = "watched_apis"
    __table_args__ = (
        UniqueConstraint("profile_id", "api_id", name="uq_watched_api_profile_api"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("stack_profiles.id", ondelete="CASCADE"), nullable=False)
    api_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_catalog.id"), nullable=False)
    sdk_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    profile: Mapped["StackProfile"] = relationship("StackProfile", back_populates="watched_apis")
    api: Mapped["APICatalog"] = relationship("APICatalog")
