import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/apiradar"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-jwt-secret-key-here"
    OPENAI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    RESEND_API_KEY: str = ""
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
