from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import logging
import secrets
import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import extract, func, text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import (
    Base,
    engine,
    get_db,
    ensure_default_admin_user,
    run_startup_migrations,
)
from app.models import Appointment, ArchivedMessage, ContactMessage, User, PasswordResetOTP, EmailVerificationOTP
from app.schemas import (
    AppointmentCreateRequest,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    AdminAppointmentResponse,
    AdminMessageStatusUpdateRequest,
    AdminStatsResponse,
    ArchivedMessageResponse,
    ContactMessageCreateRequest,
    ContactMessageResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    OTPResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.security import (
    create_access_token,
    decode_user_id,
    hash_password,
    verify_password,
)
from app.scheduling import (
    assert_may_cancel,
    assert_min_lead_before_start,
    resolve_appointment_start,
)

MONTHLY_APPOINTMENT_LIMIT = 5

security = HTTPBearer(auto_error=False)
logger = logging.getLogger("prime_api")

JWT_PLACEHOLDER = "replace-with-a-long-random-secret-at-least-32-characters"
RATE_LIMITS: dict[tuple[str, str], list[float]] = {}


def is_production() -> bool:
    return settings.ENVIRONMENT.lower() in {"prod", "production"}


def client_key(request: Request, email: str | None = None) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",", 1)[0].strip() or (request.client.host if request.client else "unknown")
    normalized_email = (email or "").strip().lower()
    return f"{ip}:{normalized_email}" if normalized_email else ip


def assert_rate_limit(key: str, action: str, limit: int, window_seconds: int) -> None:
    now = time.monotonic()
    bucket_key = (action, key)
    recent = [t for t in RATE_LIMITS.get(bucket_key, []) if now - t < window_seconds]
    if len(recent) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait a few minutes and try again.",
        )
    recent.append(now)
    RATE_LIMITS[bucket_key] = recent


def check_runtime_configuration() -> None:
    if settings.JWT_SECRET == JWT_PLACEHOLDER:
        message = "JWT_SECRET is still using the placeholder value."
        if is_production():
            raise RuntimeError(f"{message} Set a strong unique secret before deploying.")
        logger.warning("%s Generate a strong value for production.", message)

    if is_production() and (not settings.SMTP_USER or not settings.SMTP_PASSWORD):
        raise RuntimeError("SMTP_USER and SMTP_PASSWORD are required in production.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logging.basicConfig(level=logging.INFO)
    check_runtime_configuration()
    Base.metadata.create_all(bind=engine)
    run_startup_migrations()
    ensure_default_admin_user()
    
    # Run cleanup of old archived messages on startup
    def cleanup_old_archived_messages():
        from datetime import datetime, timedelta, timezone
        from app.db import SessionLocal
        
        db = SessionLocal()
        try:
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            old_messages = (
                db.query(ArchivedMessage)
                .filter(ArchivedMessage.archived_at < thirty_days_ago)
                .all()
            )
            deleted_count = len(old_messages)
            for msg in old_messages:
                db.delete(msg)
            db.commit()
            if deleted_count > 0:
                print(f"Cleaned up {deleted_count} archived messages older than 30 days")
        except Exception as e:
            print(f"Error cleaning up archived messages: {e}")
        finally:
            db.close()
    
    # Run cleanup in background
    import threading
    cleanup_thread = threading.Thread(target=cleanup_old_archived_messages)
    cleanup_thread.start()
    
    yield


app = FastAPI(title="PRIME API", lifespan=lifespan)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if is_production():
        response.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=31536000; includeSubDomains",
        )
    return response

_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    # Next.js often uses other ports (3003, 3004, …); allow any localhost origin in dev
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> int:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = decode_user_id(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user_id


def get_current_admin(
    creds: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Ensure user is authenticated and has admin privileges."""
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id = decode_user_id(creds.credentials)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        logger.exception("health_database_check_failed")
        raise HTTPException(status_code=503, detail="Database is unavailable")
    smtp_configured = bool(settings.SMTP_SERVER and settings.SMTP_USER and settings.SMTP_PASSWORD)
    return {"ok": True, "database": "ok", "smtp_configured": smtp_configured}


@app.post("/auth/register", status_code=201)
def register(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    assert_rate_limit(client_key(request, payload.email), "register", 5, 15 * 60)
    user = db.query(User).filter(User.email == payload.email).first()
    if user is not None and user.is_email_verified:
        raise HTTPException(status_code=409, detail="Email already registered")

    if user is None:
        user = User(
            email=payload.email,
            username=payload.username,
            password_hash=hash_password(payload.password),
            gender=payload.gender,
            is_email_verified=False,
        )
        db.add(user)
        db.commit()
    else:
        user.username = payload.username
        user.password_hash = hash_password(payload.password)
        user.gender = payload.gender
        db.commit()

    existing_token = db.query(EmailVerificationOTP).filter(EmailVerificationOTP.email == payload.email).first()
    if existing_token:
        db.delete(existing_token)
        db.commit()

    # Auto-verify user if SMTP is not configured (local development)
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        user.is_email_verified = True
        db.commit()
        logger.warning("SMTP not configured; auto-verifying %s in development", payload.email)
        return {"message": "Account created and verified for local development."}

    token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    token_record = EmailVerificationOTP(
        email=payload.email,
        token=token,
        expires_at=expires_at,
    )
    db.add(token_record)
    db.commit()

    verification_link = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email?token={token}"
    if not send_verification_email(payload.email, verification_link):
        logger.error("verification_email_failed email=%s", payload.email)
        raise HTTPException(
            status_code=500,
            detail=(
                "We could not send the verification email right now. "
                "Please try again later or contact support."
            ),
        )

    return {"message": "Verification email sent. Please click the link in your inbox to verify your account."}


@app.post("/auth/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    assert_rate_limit(client_key(request, payload.email), "login", 10, 15 * 60)
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="This email is not registered")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="The password for this email is incorrect")
    if not user.is_email_verified and user.email != settings.ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


def generate_token() -> str:
    """Generate a secure token for email verification and password reset."""
    return secrets.token_urlsafe(32)


def send_email(
    email: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> bool:
    """Send an email using SMTP settings from configuration."""
    if not settings.SMTP_SERVER or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(
            "SMTP settings are missing. Set SMTP_SERVER, SMTP_USER, and SMTP_PASSWORD in .env."
        )
        return False

    sender_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    sender_name = settings.SMTP_FROM_NAME or "PRIME"
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{sender_name} <{sender_email}>"
    message["To"] = email

    part1 = MIMEText(text_body, "plain")
    part2 = MIMEText(html_body, "html")
    message.attach(part1)
    message.attach(part2)

    try:
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_USE_TLS:
                server.ehlo()
                server.starttls()
                server.ehlo()

        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(sender_email, [email], message.as_string())
        server.quit()
        logger.info("email_sent to=%s subject=%s", email, subject)
        return True
    except Exception as e:
        logger.exception("email_send_failed to=%s subject=%s error=%s", email, subject, e)
        return False


def send_verification_email(email: str, verification_link: str) -> bool:
    subject = "Verify Your PRIME Account Email"
    text = (
        f"Click the link below to verify your PRIME account:\n\n{verification_link}\n\n"
        "This link expires in 10 minutes."
    )
    html = (
        f"<html><body><p>Click the link below to verify your PRIME account:</p>"
        f"<p><a href=\"{verification_link}\">Verify Email</a></p>"
        f"<p>This link expires in 10 minutes.</p></body></html>"
    )
    return send_email(email, subject, text, html)


def send_reset_email(email: str, reset_link: str) -> bool:
    subject = "Reset Your PRIME Account Password"
    text = (
        f"Click the link below to reset your PRIME password:\n\n{reset_link}\n\n"
        "This link expires in 10 minutes."
    )
    html = (
        f"<html><body><p>Click the link below to reset your PRIME password:</p>"
        f"<p><a href=\"{reset_link}\">Reset Password</a></p>"
        f"<p>This link expires in 10 minutes.</p></body></html>"
    )
    return send_email(email, subject, text, html)


@app.post("/auth/forgot-password", response_model=OTPResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Request password reset via email link."""
    assert_rate_limit(client_key(request, payload.email), "forgot_password", 3, 15 * 60)
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        # Don't reveal if email exists or not (security best practice)
        return OTPResponse(message="If email exists, a password reset link has been sent.")

    token = generate_token()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    db.query(PasswordResetOTP).filter(PasswordResetOTP.email == payload.email).delete()
    token_record = PasswordResetOTP(
        email=payload.email,
        token=token,
        expires_at=expires_at,
    )
    db.add(token_record)
    db.commit()

    reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/forgot-password?token={token}"
    if not send_reset_email(payload.email, reset_link):
        logger.error("password_reset_email_failed email=%s", payload.email)
        raise HTTPException(
            status_code=500,
            detail=(
                "We could not send the password reset email right now. "
                "Please try again later or contact support."
            ),
        )

    return OTPResponse(message="If email exists, a password reset link has been sent.")


@app.post("/auth/reset-password", response_model=OTPResponse)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Reset password using a secure reset token."""
    assert_rate_limit(client_key(request), "reset_password", 5, 15 * 60)
    token_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.token == payload.token,
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid password reset token")

    if token_record.expires_at.replace(tzinfo=None) < datetime.now(timezone.utc).replace(tzinfo=None):
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=401, detail="Password reset token has expired")

    user = db.query(User).filter(User.email == token_record.email).first()
    if not user:
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(payload.new_password)
    db.delete(token_record)
    db.commit()

    return OTPResponse(message="Password has been reset successfully")


@app.post("/auth/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    """Verify email using a secure registration token."""
    token_record = db.query(EmailVerificationOTP).filter(
        EmailVerificationOTP.token == payload.token,
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid verification token")

    expires_at = token_record.expires_at
    if hasattr(expires_at, 'tzinfo') and expires_at.tzinfo is not None:
        expires_at = expires_at.replace(tzinfo=None)

    if expires_at < datetime.now(timezone.utc).replace(tzinfo=None):
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=401, detail="Verification token has expired")

    user = db.query(User).filter(User.email == token_record.email).first()
    if not user:
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_email_verified:
        db.delete(token_record)
        db.commit()
        raise HTTPException(status_code=409, detail="Email already verified")

    user.is_email_verified = True
    db.delete(token_record)
    db.commit()

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.get("/me", response_model=MeResponse)
def me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        is_email_verified=user.is_email_verified,
        profile_picture=user.profile_picture,
    )


@app.patch("/me", response_model=MeResponse)
def update_me(
    payload: UpdateProfileRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if payload.profile_picture is not None:
        user.profile_picture = payload.profile_picture
    db.add(user)
    db.commit()
    db.refresh(user)
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        is_email_verified=user.is_email_verified,
        profile_picture=user.profile_picture,
    )


@app.get("/appointments", response_model=list[AppointmentResponse])
def list_appointments(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Appointment)
        .filter(Appointment.user_id == user_id)
        .order_by(Appointment.created_at.desc())
        .all()
    )
    return rows


@app.post("/appointments", response_model=AppointmentResponse)
def create_appointment(
    payload: AppointmentCreateRequest,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    monthly_count = (
        db.query(func.count(Appointment.id))
        .filter(
            Appointment.user_id == user_id,
            extract("year", Appointment.created_at) == now.year,
            extract("month", Appointment.created_at) == now.month,
            Appointment.status != "cancelled",
        )
        .scalar()
    )
    if (monthly_count or 0) >= MONTHLY_APPOINTMENT_LIMIT:
        raise HTTPException(
            status_code=409,
            detail=f"Monthly appointment limit reached ({MONTHLY_APPOINTMENT_LIMIT})",
        )

    start_utc = resolve_appointment_start(payload.day, payload.month, now)
    assert_min_lead_before_start(start_utc, now)

    appt = Appointment(
        user_id=user_id,
        name=payload.name,
        age=payload.age,
        address=payload.address,
        day=payload.day,
        month=payload.month,
        location=payload.location,
        document_type=payload.document_type,
        status="pending",
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


@app.post("/appointments/{appointment_id}/cancel", response_model=AppointmentResponse)
def cancel_appointment(
    appointment_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    appt = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id, Appointment.user_id == user_id)
        .first()
    )
    if appt is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if appt.status == "cancelled":
        raise HTTPException(status_code=409, detail="Already cancelled")

    assert_may_cancel(appt.created_at)

    appt.status = "cancelled"
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt


# ============================================================================
# ADMIN ENDPOINTS
# ============================================================================

@app.get("/admin/stats", response_model=AdminStatsResponse)
def admin_stats(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get admin dashboard statistics."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_appointments = db.query(func.count(Appointment.id)).scalar() or 0
    total_messages = db.query(func.count(ContactMessage.id)).scalar() or 0
    pending = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == "pending")
        .scalar()
        or 0
    )
    confirmed = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == "confirmed")
        .scalar()
        or 0
    )
    completed = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == "completed")
        .scalar()
        or 0
    )
    cancelled = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.status == "cancelled")
        .scalar()
        or 0
    )
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)

    new_users_today = (
        db.query(func.count(User.id))
        .filter(User.created_at >= today_start)
        .scalar()
        or 0
    )
    appointments_today = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.created_at >= today_start)
        .scalar()
        or 0
    )
    appointments_last_7_days = (
        db.query(func.count(Appointment.id))
        .filter(Appointment.created_at >= week_start)
        .scalar()
        or 0
    )
    document_type_rows = (
        db.query(Appointment.document_type, func.count(Appointment.id))
        .group_by(Appointment.document_type)
        .all()
    )
    appointments_by_document_type = {
        row[0] or "Unknown": row[1] for row in document_type_rows
    }

    return AdminStatsResponse(
        total_users=total_users,
        total_appointments=total_appointments,
        total_messages=total_messages,
        pending_appointments=pending,
        confirmed_appointments=confirmed,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
        new_users_today=new_users_today,
        appointments_today=appointments_today,
        appointments_last_7_days=appointments_last_7_days,
        appointments_by_document_type=appointments_by_document_type,
    )


def as_utc_naive(value) -> datetime:
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def date_range_from_days(days: int) -> tuple[datetime, datetime]:
    safe_days = max(1, min(days, 365))
    end = datetime.now(timezone.utc).replace(tzinfo=None)
    start = end - timedelta(days=safe_days - 1)
    return (
        start.replace(hour=0, minute=0, second=0, microsecond=0),
        end.replace(hour=23, minute=59, second=59, microsecond=999999),
    )


def daily_buckets(start: datetime, end: datetime) -> list[dict[str, int | str]]:
    days = (end.date() - start.date()).days + 1
    return [
        {"date": (start.date() + timedelta(days=i)).isoformat(), "count": 0}
        for i in range(days)
    ]


@app.get("/admin/analytics")
def admin_analytics(
    days: int = Query(default=30, ge=1, le=365),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Range-aware dashboard analytics from currently tracked app data."""
    start, end = date_range_from_days(days)
    previous_start = start - timedelta(days=days)
    previous_end = start - timedelta(microseconds=1)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    users = db.query(User).all()
    appointments = db.query(Appointment).all()
    messages = db.query(ContactMessage).all()

    def in_range(created_at, range_start: datetime, range_end: datetime) -> bool:
        created = as_utc_naive(created_at)
        return range_start <= created <= range_end

    current_appointments = [
        a for a in appointments if in_range(a.created_at, start, end)
    ]
    previous_appointments = [
        a for a in appointments if in_range(a.created_at, previous_start, previous_end)
    ]
    current_users = [u for u in users if in_range(u.created_at, start, end)]
    previous_users = [u for u in users if in_range(u.created_at, previous_start, previous_end)]

    appt_buckets = daily_buckets(start, end)
    user_buckets = daily_buckets(start, end)
    appt_bucket_map = {b["date"]: b for b in appt_buckets}
    user_bucket_map = {b["date"]: b for b in user_buckets}
    for appt in current_appointments:
        key = as_utc_naive(appt.created_at).date().isoformat()
        appt_bucket_map[key]["count"] += 1
    for user in current_users:
        key = as_utc_naive(user.created_at).date().isoformat()
        user_bucket_map[key]["count"] += 1

    status_counts = {"pending": 0, "confirmed": 0, "completed": 0, "cancelled": 0}
    document_counts: dict[str, int] = {}
    location_counts: dict[str, int] = {}
    cancellation_by_document: dict[str, int] = {}
    cancellation_reasons: dict[str, int] = {}
    weekday_counts: dict[str, int] = {}
    pending_over_three_days = 0
    for appt in current_appointments:
        status = (appt.status or "pending").lower()
        status_counts[status] = status_counts.get(status, 0) + 1
        doc = appt.document_type or "Unknown"
        document_counts[doc] = document_counts.get(doc, 0) + 1
        location_counts[appt.location or "Unknown"] = location_counts.get(appt.location or "Unknown", 0) + 1
        weekday = as_utc_naive(appt.created_at).strftime("%A")
        weekday_counts[weekday] = weekday_counts.get(weekday, 0) + 1
        if status == "cancelled":
            cancellation_by_document[doc] = cancellation_by_document.get(doc, 0) + 1
            reason = (appt.cancellation_reason or "No reason provided").strip()
            cancellation_reasons[reason] = cancellation_reasons.get(reason, 0) + 1
        if status == "pending" and as_utc_naive(appt.created_at) < now - timedelta(days=3):
            pending_over_three_days += 1

    total_appts = len(current_appointments)
    completed = status_counts.get("completed", 0)
    cancelled = status_counts.get("cancelled", 0)
    total_users = len(users)
    active_user_ids = {a.user_id for a in current_appointments}
    active_users = len(active_user_ids)
    booking_rate = round((active_users / total_users) * 100, 1) if total_users else 0
    cancellation_rate = round((cancelled / total_appts) * 100, 1) if total_appts else 0
    completion_rate = round((completed / total_appts) * 100, 1) if total_appts else 0

    most_booked_document = max(document_counts.items(), key=lambda item: item[1], default=("No bookings", 0))
    busiest_day = max(weekday_counts.items(), key=lambda item: item[1], default=("No activity", 0))
    busiest_location = max(location_counts.items(), key=lambda item: item[1], default=("No locations", 0))

    alerts: list[dict[str, str]] = []
    previous_cancelled = sum(
        1 for a in previous_appointments if (a.status or "").lower() == "cancelled"
    )
    if previous_cancelled and cancelled >= previous_cancelled * 2:
        alerts.append({"level": "warning", "message": "Cancellations are at least double the previous period."})
    if total_appts == 0:
        alerts.append({"level": "info", "message": "No appointments were created in this date range."})
    if previous_users and len(current_users) <= len(previous_users) * 0.5:
        alerts.append({"level": "warning", "message": "User signups dropped by 50% or more versus the previous period."})
    if pending_over_three_days:
        alerts.append({"level": "warning", "message": f"{pending_over_three_days} pending appointment(s) are older than 3 days."})

    return {
        "range": {"days": days, "start": start.date().isoformat(), "end": end.date().isoformat()},
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "totals": {
            "users": total_users,
            "new_users": len(current_users),
            "appointments": total_appts,
            "messages": len([m for m in messages if in_range(m.created_at, start, end)]),
            "active_users": active_users,
            "previous_appointments": len(previous_appointments),
            "previous_users": len(previous_users),
        },
        "status_counts": status_counts,
        "document_counts": document_counts,
        "location_counts": location_counts,
        "cancellation_by_document": cancellation_by_document,
        "cancellation_reasons": cancellation_reasons,
        "appointments_over_time": appt_buckets,
        "users_over_time": user_buckets,
        "kpis": {
            "booking_rate": booking_rate,
            "completion_rate": completion_rate,
            "cancellation_rate": cancellation_rate,
            "pending_over_three_days": pending_over_three_days,
            "average_turnaround_hours": None,
            "average_confirmation_hours": None,
        },
        "insights": {
            "most_booked_document": {"label": most_booked_document[0], "count": most_booked_document[1]},
            "busiest_day": {"label": busiest_day[0], "count": busiest_day[1]},
            "busiest_location": {"label": busiest_location[0], "count": busiest_location[1]},
            "top_cancellation_reason": max(
                cancellation_reasons.items(),
                key=lambda item: item[1],
                default=("No cancellations", 0),
            ),
        },
        "alerts": alerts,
    }


@app.post("/contact", response_model=ContactMessageResponse, status_code=201)
def create_contact_message(
    payload: ContactMessageCreateRequest,
    db: Session = Depends(get_db),
):
    contact_message = ContactMessage(
        fullname=payload.fullname,
        email=payload.email,
        phone=payload.phone,
        subject=payload.subject,
        message=payload.message,
        status="new",
    )
    db.add(contact_message)
    db.commit()
    db.refresh(contact_message)
    return contact_message


@app.get("/admin/messages", response_model=list[ContactMessageResponse])
def admin_list_messages(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    messages = (
        db.query(ContactMessage)
        .order_by(ContactMessage.created_at.desc())
        .all()
    )
    return messages


@app.get("/admin/messages/{message_id}", response_model=ContactMessageResponse)
def admin_get_message(
    message_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    message = (
        db.query(ContactMessage)
        .filter(ContactMessage.id == message_id)
        .first()
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@app.patch("/admin/messages/{message_id}", response_model=ContactMessageResponse)
def admin_update_message_status(
    message_id: int,
    payload: AdminMessageStatusUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    message = (
        db.query(ContactMessage)
        .filter(ContactMessage.id == message_id)
        .first()
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    message.status = payload.status
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@app.delete("/admin/messages/{message_id}", status_code=204)
def admin_delete_message(
    message_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    message = (
        db.query(ContactMessage)
        .filter(ContactMessage.id == message_id)
        .first()
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Archive the message instead of deleting it
    archived_message = ArchivedMessage(
        original_message_id=message.id,
        fullname=message.fullname,
        email=message.email,
        phone=message.phone,
        subject=message.subject,
        message=message.message,
        status=message.status,
    )
    db.add(archived_message)
    db.delete(message)
    db.commit()
    return


@app.get("/admin/archived-messages", response_model=list[ArchivedMessageResponse])
def admin_list_archived_messages(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all archived messages."""
    archived_messages = (
        db.query(ArchivedMessage)
        .order_by(ArchivedMessage.archived_at.desc())
        .all()
    )
    return archived_messages


@app.delete("/admin/archived-messages/{archive_id}", status_code=204)
def admin_delete_archived_message(
    archive_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Permanently delete an archived message."""
    archived_message = (
        db.query(ArchivedMessage)
        .filter(ArchivedMessage.id == archive_id)
        .first()
    )
    if archived_message is None:
        raise HTTPException(status_code=404, detail="Archived message not found")
    db.delete(archived_message)
    db.commit()
    return


@app.post("/admin/archived-messages/cleanup", status_code=200)
def admin_cleanup_old_archived_messages(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete archived messages older than 30 days."""
    from datetime import datetime, timedelta, timezone
    
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    old_messages = (
        db.query(ArchivedMessage)
        .filter(ArchivedMessage.archived_at < thirty_days_ago)
        .all()
    )
    
    deleted_count = len(old_messages)
    for msg in old_messages:
        db.delete(msg)
    db.commit()
    
    return {"message": f"Deleted {deleted_count} archived messages older than 30 days"}


@app.get("/admin/users", response_model=list[UserResponse])
def admin_list_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all users."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@app.get("/admin/users/{user_id}", response_model=UserResponse)
def admin_get_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/admin/users/{user_id}/appointments", response_model=list[AdminAppointmentResponse])
def admin_user_appointments(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get all appointments for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    appointments = (
        db.query(Appointment)
        .filter(Appointment.user_id == user_id)
        .order_by(Appointment.created_at.desc())
        .all()
    )
    return appointments


@app.get("/admin/appointments", response_model=list[AdminAppointmentResponse])
def admin_list_appointments(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """List all appointments."""
    appointments = db.query(Appointment).order_by(Appointment.created_at.desc()).all()
    return appointments


@app.get("/admin/appointments/{appointment_id}", response_model=AdminAppointmentResponse)
def admin_get_appointment(
    appointment_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Get a specific appointment."""
    appointment = (
        db.query(Appointment).filter(Appointment.id == appointment_id).first()
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@app.patch("/admin/appointments/{appointment_id}", response_model=AdminAppointmentResponse)
def admin_update_appointment_status(
    appointment_id: int,
    payload: AppointmentStatusUpdateRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update appointment status."""
    appointment = (
        db.query(Appointment).filter(Appointment.id == appointment_id).first()
    )
    if appointment is None:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = payload.status
    if payload.status == "cancelled" and payload.cancellation_reason:
        appointment.cancellation_reason = payload.cancellation_reason
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@app.post("/admin/users/{user_id}/make-admin")
def admin_promote_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Promote a user to admin."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=409, detail="User is already admin")
    user.is_admin = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": f"User {user.email} is now an admin", "user": UserResponse.model_validate(user)}


@app.post("/admin/users/{user_id}/remove-admin")
def admin_demote_user(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Remove admin privileges from a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_admin:
        raise HTTPException(status_code=409, detail="User is not an admin")
    if user.id == admin.id:
        raise HTTPException(status_code=409, detail="Cannot remove your own admin privileges")
    user.is_admin = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": f"Admin privileges removed from {user.email}", "user": UserResponse.model_validate(user)}


@app.post("/admin/users/{user_id}/toggle-active", response_model=UserResponse)
def admin_toggle_user_active(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Toggle user active status (activate/deactivate)."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=409, detail="Cannot deactivate your own account")
    user.is_active = not user.is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
