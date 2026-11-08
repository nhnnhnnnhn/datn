from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5432/public"
    secret_key: str = "default-secret-key"
    access_token_expire_minutes: int = 60
    llm_api_key: str = "default-api-key"
    llm_model: str = "default-model"


@lru_cache
def get_settings() -> Settings:
    return Settings()
