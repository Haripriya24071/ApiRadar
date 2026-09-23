import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class APICatalog(Base):
    __tablename__ = "api_catalog"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    changelog_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    rss_feed_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    github_repo: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    openapi_spec_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    last_scraped_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, default=datetime.utcnow)

