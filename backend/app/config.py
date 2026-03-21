import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key")
    environment: str = os.getenv("ENVIRONMENT", "production")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
