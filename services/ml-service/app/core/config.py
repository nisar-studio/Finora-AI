from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    service_name: str = "finora-ml"
    ml_service_api_key: str = ""
    debug: bool = False
    model_version: str = "v1"


settings = Settings()