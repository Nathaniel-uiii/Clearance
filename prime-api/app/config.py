from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Override in .env with Supabase, e.g. postgresql+psycopg://...
    # Default SQLite works locally without installing Postgres.
    DATABASE_URL: str = "sqlite:///./prime_local.db"
    JWT_SECRET: str = "replace-with-a-long-random-secret-at-least-32-characters"
    JWT_ALG: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 24 * 7
    # Comma-separated origins for browser requests from Next.js / XAMPP / Apache
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001,"
        "http://localhost:3002,http://127.0.0.1:3002,"
        "http://localhost,http://127.0.0.1"
    )


settings = Settings()
