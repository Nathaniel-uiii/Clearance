from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True
    )

    DATABASE_URL: str = "sqlite:///./prime_local.db"

    JWT_SECRET: str = "replace-with-a-long-random-secret-at-least-32-characters"
    JWT_ALG: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7

    CORS_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002,"
        "http://localhost,http://127.0.0.1"
    )

    APPOINTMENT_TZ: str = "Asia/Manila"
    APPOINTMENT_START_HOUR: int = 9
    APPOINTMENT_START_MINUTE: int = 0

    # Gmail SMTP
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "PRIME"

    FRONTEND_URL: str = "http://localhost:3000"


settings = Settings()