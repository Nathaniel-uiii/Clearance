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
            # Check if users table exists
            users_exist = conn.execute(
                text(
                    "SELECT COUNT(*) FROM sqlite_master "
                    "WHERE type='table' AND name='users'"
                )
            ).scalar()
            
            if users_exist:
                # Add is_email_verified column to users table if it doesn't exist
                user_cols = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                user_names = {row[1] for row in user_cols}
                if "is_email_verified" not in user_names:
                    conn.execute(
                        text(
                            "ALTER TABLE users ADD COLUMN is_email_verified "
                            "BOOLEAN NOT NULL DEFAULT 0"
                        )
                    )
            
            # Check for appointments table migration
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
            # Add is_email_verified column to users table
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                    "is_email_verified BOOLEAN DEFAULT FALSE"
                )
            )
            
            conn.execute(
                text(
                    "ALTER TABLE IF EXISTS password_reset_otps "
                    "ALTER COLUMN otp_code TYPE VARCHAR(64)"
                )
            )
            conn.execute(
                text(
                    "ALTER TABLE IF EXISTS email_verification_otps "
                    "ALTER COLUMN otp_code TYPE VARCHAR(64)"
                )
            )
            
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
    from app.security import hash_password

    db = SessionLocal()
    try:
        # Use raw SQL to avoid model issues during migration
        result = db.execute(text("SELECT id, password_hash, is_admin FROM users WHERE email = :email"), {"email": _DEFAULT_ADMIN_EMAIL})
        user_row = result.first()
        
        if user_row is None:
            # Create admin user with raw SQL
            db.execute(
                text(
                    "INSERT INTO users (email, username, password_hash, gender, is_admin, is_email_verified) "
                    "VALUES (:email, :username, :password_hash, :gender, :is_admin, :is_email_verified)"
                ),
                {
                    "email": _DEFAULT_ADMIN_EMAIL,
                    "username": "Admin User", 
                    "password_hash": hash_password(_DEFAULT_ADMIN_PASSWORD),
                    "gender": None,
                    "is_admin": True,
                    "is_email_verified": True,  # Admin should be verified
                }
            )
            db.commit()
            return
            
        user_id, password_hash, is_admin = user_row
        
        # Fix legacy password hash
        if password_hash == _LEGACY_BAD_ADMIN_HASH:
            db.execute(
                text("UPDATE users SET password_hash = :password_hash WHERE id = :id"),
                {"password_hash": hash_password(_DEFAULT_ADMIN_PASSWORD), "id": user_id}
            )
            db.commit()
            return
            
        # Ensure admin flag is set
        if not is_admin:
            db.execute(
                text("UPDATE users SET is_admin = :is_admin WHERE id = :id"),
                {"is_admin": True, "id": user_id}
            )
            db.commit()
    finally:
        db.close()
