from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://mikrotik_user:mikrotik_pass@postgres:5432/mikrotik_geo"
    
    # MikroTik
    mikrotik_host: Optional[str] = None
    mikrotik_port: int = 8728
    mikrotik_user: Optional[str] = None
    mikrotik_password: Optional[str] = None
    mikrotik_use_ssl: bool = False
    
    # Polling
    poll_interval_seconds: int = 30
    
    # GeoIP
    geoip_api_url: str = "http://ip-api.com/json"
    
    # Authentication
    admin_username: str = "admin"
    admin_password: str = "admin123"
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440  # 24 hours
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
