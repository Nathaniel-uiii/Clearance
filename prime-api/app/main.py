from contextlib import asynccontextmanager
from datetime import datetime, timezone, timedelta
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import (
    Base,
    engine,
    get_db,
    ensure_default_admin_user,
    run_startup_migrations,
)
from app.models import Appointment, ContactMessage, User, PasswordResetOTP, EmailVerificationOTP
from app.schemas import (
    AppointmentCreateRequest,
    AppointmentResponse,
    AppointmentStatusUpdateRequest,
    AdminAppointmentResponse,
    AdminMessageStatusUpdateRequest,
    AdminStatsResponse,
    ContactMessageCreateRequest,
    ContactMessageResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MeResponse,
    OTPResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.security import (
    create_access_token,
    decode_user_id,
    hash_password,
    verify_password,
    check_is_admin,
)
from app.scheduling import (
    assert_may_cancel,
    assert_min_lead_before_start,
    resolve_appointment_start,
)

MONTHLY_APPOINTMENT_LIMIT = 5

security = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_startup_migrations()
    ensure_default_admin_user()
    yield


app = FastAPI(title="PRIME API", lifespan=lifespan)

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
    if not check_is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
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
        raise HTTPException(
            status_code=500,
            detail="Verification email could not be sent. Check SMTP configuration.",
        )

    return {"message": "Verification email sent. Please click the link in your inbox to verify your account."}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="This email is not registered")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong password")
    if not user.is_email_verified and not check_is_admin(user):
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
        return True
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")
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
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request password reset via email link."""
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
        raise HTTPException(
            status_code=500,
            detail="Password reset email could not be sent. Check SMTP configuration.",
        )

    return OTPResponse(message="If email exists, a password reset link has been sent.")


@app.post("/auth/reset-password", response_model=OTPResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a secure reset token."""
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
    user = db.query(User).filter(User.id == user_id).one()
    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_admin=user.is_admin,
        is_email_verified=user.is_email_verified,
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
    return AdminStatsResponse(
        total_users=total_users,
        total_appointments=total_appointments,
        pending_appointments=pending,
        confirmed_appointments=confirmed,
        completed_appointments=completed,
        cancelled_appointments=cancelled,
    )


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
    db.delete(message)
    db.commit()
    return


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
