from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.config import settings
from app.db import Base, engine, get_db
from app.models import Appointment, User
from app.schemas import (
    AppointmentCreateRequest,
    AppointmentResponse,
    LoginRequest,
    MeResponse,
    RegisterRequest,
    TokenResponse,
)
from app.security import (
    create_access_token,
    decode_user_id,
    hash_password,
    verify_password,
)

MONTHLY_APPOINTMENT_LIMIT = 5
CANCEL_WINDOW_HOURS = 3
MAX_PASSWORD_BYTES = 72

security = HTTPBearer(auto_error=False)


def _validate_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=422,
            detail=f"Password must be at most {MAX_PASSWORD_BYTES} bytes",
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="PRIME API", lifespan=lifespan)

_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
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


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/auth/register", status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    _validate_password_length(payload.password)
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=payload.email,
        username=payload.username,
        password_hash=hash_password(payload.password),
        gender=payload.gender,
        security_q1=payload.security_q1,
        security_q2=payload.security_q2,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email}


@app.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@app.get("/me", response_model=MeResponse)
def me(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).one()
    return MeResponse(id=user.id, email=user.email, username=user.username)


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

    appt = Appointment(
        user_id=user_id,
        name=payload.name,
        age=payload.age,
        address=payload.address,
        day=payload.day,
        month=payload.month,
        location=payload.location,
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

    created = appt.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    deadline = created + timedelta(hours=CANCEL_WINDOW_HOURS)
    if datetime.now(timezone.utc) > deadline:
        raise HTTPException(
            status_code=409,
            detail=f"Cancellation window ({CANCEL_WINDOW_HOURS}h) has expired",
        )

    appt.status = "cancelled"
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return appt
