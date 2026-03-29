from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


_url = settings.DATABASE_URL
_connect_args: dict = {}
if _url.startswith("sqlite"):
    _connect_args["check_same_thread"] = False
elif _url.startswith("postgresql") and "sslmode" not in _url:
    # Supabase and most hosted Postgres require TLS
    _connect_args["sslmode"] = "require"

engine = create_engine(
    _url,
    pool_pre_ping=not _url.startswith("sqlite"),
    connect_args=_connect_args,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
