import os
from typing import List


class Settings:
    """Application settings - reads directly from environment variables"""
    
    def __init__(self):
        # Read DATABASE_URL directly from environment
        self.database_url = os.environ.get("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.admin_user = os.environ.get("ADMIN_USER", "admin")
        self.admin_password = os.environ.get("ADMIN_PASSWORD", "admin")
        
        # Parse CORS origins
        cors_origins_str = os.environ.get("CORS_ORIGINS", "http://localhost:8080")
        self.cors_origins = [
            item.strip() 
            for item in cors_origins_str.split(",") 
            if item.strip()
        ]
        
        self.openai_api_key = os.environ.get("OPENAI_API_KEY", "")
        self.openai_model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

    @property
    def cors_origins_list(self) -> List[str]:
        return self.cors_origins


_settings_instance = None

def get_settings() -> Settings:
    """Get settings instance (singleton without lru_cache to allow env updates)"""
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
