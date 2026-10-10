from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self) -> None:
        self.database_url: str = os.getenv(
            "DATABASE_URL", "sqlite:///./library.db"
        )
        self.cors_origins: list[str] = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
            if o.strip()
        ]
        self.seed_on_startup: bool = os.getenv("SEED_ON_STARTUP", "true").lower() == "true"
        self.loan_days: int = int(os.getenv("LOAN_DAYS", "14"))
        self.max_active_loans: int = int(os.getenv("MAX_ACTIVE_LOANS", "5"))


@lru_cache
def get_settings() -> Settings:
    return Settings()
