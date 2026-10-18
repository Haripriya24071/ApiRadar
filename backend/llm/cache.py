import hashlib
import json
from typing import Optional, Any
import redis
from config import settings

class LLMCache:
    def __init__(self):
        self._disabled = False
        try:
            self.client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Failed to connect to Redis cache: {e}")
            self.client = None

    def _get_key(self, raw_content: str) -> str:
        sha = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()
        return f"llm:{sha}"

    def get(self, raw_content: str) -> Optional[Any]:
        if not self.client or self._disabled:
            return None
        try:
            key = self._get_key(raw_content)
            data = self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            self._disable(e)
        return None

    def set(self, raw_content: str, result: Any) -> None:
        if not self.client or self._disabled:
            return
        try:
            key = self._get_key(raw_content)
            self.client.set(key, json.dumps(result), ex=604800)
        except Exception as e:
            self._disable(e)

    def _disable(self, error: Exception) -> None:
        if not self._disabled:
            print(f"Redis cache unavailable; continuing without cache: {error}")
        self._disabled = True
