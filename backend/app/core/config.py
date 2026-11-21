import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    app_name: str = "SocialPulse AI"
    debug: bool = True
    frontend_origin: str = "http://localhost:5173"

    # API Keys & URLs
    youtube_api_key: str = ""
    rapidapi_key: str = ""
    rapidapi_host: str = "instagram-scraper-stable-api.p.rapidapi.com"
    rapidapi_mcp_url: str = "https://mcp.rapidapi.com"
    instagram_provider_name: str = "Instagram Scraper Stable API"
    instagram_comments_endpoint: str = ""

    # Official Meta Graph API
    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_access_token: str = ""
    meta_instagram_user_id: str = ""
    meta_graph_api_version: str = "v21.0"
    meta_api_enabled: bool = False

    # Database
    database_url: str = "sqlite:///./socialpulse.db"
    postgres_database_url: str = ""

    # Security
    jwt_secret_key: str = "socialpulse_super_secure_jwt_secret_key_2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    def is_youtube_configured(self) -> bool:
        return bool(self.youtube_api_key and not self.youtube_api_key.startswith("YOUR_"))

    def is_rapidapi_configured(self) -> bool:
        return bool(self.rapidapi_key and not self.rapidapi_key.startswith("YOUR_"))

    def is_meta_configured(self) -> bool:
        return bool(self.meta_api_enabled and self.meta_access_token and not self.meta_access_token.startswith("YOUR_"))

settings = Settings()

