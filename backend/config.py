import os
from typing import List, Union
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DEFAULT_DB_PATH = os.path.join(ROOT_DIR, "apiradar.db").replace("\\", "/")

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_URL: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "your-jwt-secret-key-here"
    OPENAI_API_KEY: str = ""
    GITHUB_TOKEN: str = ""
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    BACKEND_BASE_URL: str = "http://localhost:8000"
    ADMIN_API_KEY: str = ""
    INLINE_MONITORING_ENABLED: bool = os.getenv("APP_ENV", "development").lower() not in {"production", "prod"}
    SCRAPE_INTERVAL_SECONDS: int = 21600
    OPENAPI_INTERVAL_SECONDS: int = 86400
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and  not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.APP_ENV.lower() in {"production", "prod"}:
            if len(self.SECRET_KEY) < 32 or self.SECRET_KEY == "your-jwt-secret-key-here":
                raise ValueError("Production requires a SECRET_KEY with at least 32 characters")
        return self

    class Config:
        env_file = (os.path.join(os.path.dirname(__file__), "../.env"), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
