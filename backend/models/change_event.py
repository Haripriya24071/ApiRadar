import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Date, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from database import Base

class ChangeEvent(Base):
    __tablename__ = "change_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("api_catalog.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    what_changed: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    affected_endpoints: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    deadline_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    migration_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    effort_estimate: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
