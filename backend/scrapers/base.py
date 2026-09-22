from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List, Dict, Any
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from models.api_catalog import APICatalog
from llm.summarizer import summarize_change

@dataclass
class RawChange:
    source: str
    title: str
    content: str
    url: str
    published_at: Optional[datetime]
    api_id: uuid.UUID
    api_name: str

class BaseScraper(ABC):
    def __init__(self, api: APICatalog):
        self.api = api

    @abstractmethod
    async def fetch(self, db: AsyncSession) -> List[RawChange]:
        raise NotImplementedError

    async def run(self, db: AsyncSession) -> List[Dict[str, Any]]:
        raw_changes = await self.fetch(db)
        structured_changes = []
        for raw in raw_changes:
            change_dict = summarize_change(raw)
            structured_changes.append(change_dict)
        return structured_changes
