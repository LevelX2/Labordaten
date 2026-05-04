from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Labordaten API"
    environment: str = "development"
    database_url: str = "sqlite:///./labordaten.db"
    frontend_origin: str = "http://localhost:5173"
    frontend_static_dir: str | None = None
    documents_dir: str = "./documents"
    runtime_settings_file: str = "./labordaten.runtime.json"
    knowledge_dir: str = "../../Labordaten-Wissen"
    install_options_file: str = "./pending-install-options.json"

    model_config = SettingsConfigDict(
        env_prefix="LABORDATEN_",
        env_file=".env",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
