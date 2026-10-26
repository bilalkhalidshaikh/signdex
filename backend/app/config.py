from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./signal_radar.db"
    cors_origins: str = "http://localhost:3100,http://127.0.0.1:3100,http://localhost:3000,http://127.0.0.1:3000"

    # Optional regex for extra allowed origins, e.g. Vercel preview deployments: https://signdex-.*\.vercel\.app
    cors_origin_regex: str | None = None

    achrocall_webhook_url: str | None = None
    achrocall_api_key: str | None = None
    achrocall_timeout_seconds: float = 10.0
    achrocall_callback_secret: str | None = None
    achrocall_arr_per_location: int = 9600
    sandbox_auto_complete: bool = True

    seed_count: int = 12
    reseed_if_stale_hours: int = 6

    vapi_public_key: str | None = None
    vapi_assistant_id: str | None = None

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix):]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def achrocall_live(self) -> bool:
        return bool(self.achrocall_webhook_url)

    @property
    def vapi_live_configured(self) -> bool:
        return bool(self.vapi_public_key and self.vapi_assistant_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()
