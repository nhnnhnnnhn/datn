from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Always load backend/.env regardless of process cwd (overrides stale shell exports)
_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_ENV_FILE, override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://postgres:postgres@localhost:5432/public"
    secret_key: str = "default-secret-key"
    access_token_expire_minutes: int = 60
    password_reset_expire_minutes: int = 30
    # No SMTP yet: when true, forgot-password includes resetToken in the JSON response.
    expose_reset_token: bool = True
    # Empty = heuristic grading / rule-based quizzes (no LLM call)
    llm_api_key: str = ""
    # Set in .env (e.g. google/gemini-3.1-flash-lite on OpenRouter)
    llm_model: str = ""
    # OpenAI-compatible base URL (OpenRouter, Gemini proxy, local gateway). Empty = auto.
    llm_base_url: str = ""
    # When true, quiz generation may call the LLM for meaning/reverse/fill_blank.
    quiz_use_llm: bool = False
    # Public path prefix when behind nginx (/api → backend). Empty for local :8000.
    root_path: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
