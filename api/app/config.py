"""Backend settings sourced from environment / .env file."""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="",
        case_sensitive=False,
        extra="ignore",
    )

    # Provider selection: auto | openclaw | anthropic | gemma
    ingles_provider: str = "auto"

    # OpenClaw Gateway (default, free via Claude Max OAuth)
    openclaw_api_url: str = ""
    openclaw_api_token: str = ""
    openclaw_model: str = "openclaw"

    # Anthropic API (optional, paid)
    anthropic_api_key: str = ""
    ingles_model: str = "claude-sonnet-4-6"

    # Gemma local (optional)
    gemma_api_url: str = ""
    gemma_api_token: str = ""
    gemma_model: str = "gemma4:e4b"

    # Sessions storage (Redis db /5 — separado del resto)
    ingles_redis_url: str = "redis://127.0.0.1:6379/5"

    # Operational
    ingles_api_token: str = ""  # bearer del cliente; vacío = sin auth (no recomendado en prod)
    ingles_rate_limit_per_min: int = 60
    ingles_cors_origins: str = "*"
    ingles_log_level: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.ingles_cors_origins.strip()
        if not raw or raw == "*":
            return ["*"]
        return [origin.strip() for origin in raw.split(",") if origin.strip()]

    @property
    def active_provider(self) -> str:
        choice = (self.ingles_provider or "auto").lower()
        if choice == "openclaw" and self.openclaw_api_url and self.openclaw_api_token:
            return "openclaw"
        if choice == "anthropic" and self.anthropic_api_key:
            return "anthropic"
        if choice == "gemma" and self.gemma_api_url and self.gemma_api_token:
            return "gemma"
        # auto: openclaw > anthropic > gemma
        if self.openclaw_api_url and self.openclaw_api_token:
            return "openclaw"
        if self.anthropic_api_key:
            return "anthropic"
        if self.gemma_api_url and self.gemma_api_token:
            return "gemma"
        return "none"


settings = Settings()
