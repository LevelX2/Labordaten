from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Labordaten API"
    environment: str = "development"
    database_url: str = "sqlite:///./labordaten.db"
    frontend_origin: str = "http://localhost:5173"
    documents_dir: str = "./documents"
    runtime_settings_file: str = "./labordaten.runtime.json"
    knowledge_dir: str = "../../KI-Wissen-Labordaten"

    model_config = SettingsConfigDict(
        env_prefix="LABORDATEN_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
