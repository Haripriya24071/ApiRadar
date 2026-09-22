import hashlib
import json
from typing import Optional, Any
import redis
from config import settings

class LLMCache:
    def __init__(self):
        try:
            self.client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            print(f"Failed to connect to Redis cache: {e}")
            self.client = None

    def _get_key(self, raw_content: str) -> str:
        sha = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()
        return f"llm:{sha}"

    def get(self, raw_content: str) -> Optional[Any]:
        if not self.client:
            return None
        try:
            key = self._get_key(raw_content)
            data = self.client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            print(f"LLMCache get error: {e}")
        return None

    def set(self, raw_content: str, result: Any) -> None:
        if not self.client:
            return
        try:
            key = self._get_key(raw_content)
            self.client.set(key, json.dumps(result), ex=604800)
        except Exception as e:
            print(f"LLMCache set error: {e}")
