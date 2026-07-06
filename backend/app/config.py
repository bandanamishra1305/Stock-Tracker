import os
from dotenv import load_dotenv

# Load .env file from root directory if it exists, otherwise check current folder
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env'))
load_dotenv()

class Settings:
    PORT: int = int(os.getenv("PORT", 8000))
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./stocktrack.db")
    
    # Fix Render/Heroku postgresql:// vs postgres:// connection string issue
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "password")
    TOTP_SECRET: str = os.getenv("TOTP_SECRET", "JBSWY3DPEHPK3PXP")  # Default base32 secret
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_jwt_key_stocktrack")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

settings = Settings()
