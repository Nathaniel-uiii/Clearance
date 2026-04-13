from sqlalchemy import create_engine, text
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


def run_startup_migrations() -> None:
    """Align existing DB files with the current models (create_all does not add new columns)."""
    dialect = engine.dialect.name
    with engine.begin() as conn:
        if dialect == "sqlite":
            n = conn.execute(
                text(
                    "SELECT COUNT(*) FROM sqlite_master "
                    "WHERE type='table' AND name='appointments'"
                )
            ).scalar()
            if not n:
                return
            cols = conn.execute(text("PRAGMA table_info(appointments)")).fetchall()
            names = {row[1] for row in cols}
            if "document_type" in names:
                return
            conn.execute(
                text(
                    "ALTER TABLE appointments ADD COLUMN document_type "
                    "VARCHAR(100) NOT NULL DEFAULT 'Barangay Clearance'"
                )
            )
        elif dialect == "postgresql":
            conn.execute(
                text(
                    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "
                    "document_type VARCHAR(100)"
                )
            )
            conn.execute(
                text(
                    "UPDATE appointments SET document_type = 'Barangay Clearance' "
                    "WHERE document_type IS NULL"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE appointments ALTER COLUMN document_type "
                    "SET DEFAULT 'Barangay Clearance'"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE appointments ALTER COLUMN document_type SET NOT NULL"
                )
            )


# Old seed in supabase_schema.sql did not verify against admin123; reset only this exact hash.
_LEGACY_BAD_ADMIN_HASH = (
    "$2b$12$R9h7cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jKMm2"
)
_DEFAULT_ADMIN_EMAIL = "admin@admin.com"
_DEFAULT_ADMIN_PASSWORD = "admin123"


def ensure_default_admin_user() -> None:
    """Create admin@admin.com if missing; fix legacy broken bcrypt seed so admin123 works."""
    from app.models import User
    from app.security import hash_password

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == _DEFAULT_ADMIN_EMAIL).first()
        if user is None:
            db.add(
                User(
                    email=_DEFAULT_ADMIN_EMAIL,
                    username="Admin User",
                    password_hash=hash_password(_DEFAULT_ADMIN_PASSWORD),
                    gender=None,
                    security_q1=None,
                    security_q2=None,
                    is_admin=True,
                )
            )
            db.commit()
            return
        if user.password_hash == _LEGACY_BAD_ADMIN_HASH:
            user.password_hash = hash_password(_DEFAULT_ADMIN_PASSWORD)
            db.add(user)
            db.commit()
            return
        if not user.is_admin:
            user.is_admin = True
            db.add(user)
            db.commit()
    finally:
        db.close()
