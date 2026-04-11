from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.baldomar_validation import (
    MAX_PASSWORD_UTF8_BYTES,
    validate_address_line,
    validate_gender_optional,
    validate_optional_security_answer,
    validate_password_baldomar,
    validate_person_name,
)


class RegisterRequest(BaseModel):
    """username holds full display name (matches prime-next Sign Up field)."""

    username: str
    email: EmailStr
    password: str
    gender: Optional[str] = None
    security_q1: Optional[str] = None
    security_q2: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_as_full_name(cls, v: str) -> str:
        err = validate_person_name(v, "Full name")
        if err:
            raise ValueError(err)
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_baldomar(cls, v: str) -> str:
        err = validate_password_baldomar(v)
        if err:
            raise ValueError(err)
        return v

    @field_validator("gender", mode="before")
    @classmethod
    def gender_empty_to_none(cls, v: object) -> object:
        if v == "":
            return None
        return v

    @field_validator("gender")
    @classmethod
    def gender_allowed(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        err = validate_gender_optional(v)
        if err:
            raise ValueError(err)
        return v

    @field_validator("security_q1", "security_q2", mode="before")
    @classmethod
    def security_empty_to_none(cls, v: object) -> object:
        if v == "":
            return None
        return v

    @field_validator("security_q1")
    @classmethod
    def security_q1_ok(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        err = validate_optional_security_answer(v, "Security answer 1")
        if err:
            raise ValueError(err)
        return v.strip()

    @field_validator("security_q2")
    @classmethod
    def security_q2_ok(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        err = validate_optional_security_answer(v, "Security answer 2")
        if err:
            raise ValueError(err)
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def login_password_byte_cap(cls, v: str) -> str:
        if len(v.encode("utf-8")) > MAX_PASSWORD_UTF8_BYTES:
            raise ValueError("Password is too long.")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    email: str
    username: str
    is_admin: bool

    model_config = {"from_attributes": True}


class AppointmentCreateRequest(BaseModel):
    name: str
    age: int = Field(ge=18, le=120, description="Must be 18+ (Baldomar registration rule).")
    address: str
    day: str
    month: str
    location: str

    @field_validator("name")
    @classmethod
    def appointment_name(cls, v: str) -> str:
        err = validate_person_name(v, "Name")
        if err:
            raise ValueError(err)
        return v.strip()

    @field_validator("address")
    @classmethod
    def appointment_address(cls, v: str) -> str:
        err = validate_address_line(v, "Address")
        if err:
            raise ValueError(err)
        return v.strip()

    @field_validator("location")
    @classmethod
    def appointment_location(cls, v: str) -> str:
        err = validate_address_line(v, "Location")
        if err:
            raise ValueError(err)
        return v.strip()


class AppointmentResponse(BaseModel):
    id: int
    name: str
    age: int
    address: str
    day: str
    month: str
    location: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactMessageCreateRequest(BaseModel):
    fullname: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str


class ContactMessageResponse(BaseModel):
    id: int
    fullname: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminMessageStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(new|read|resolved)$")


# Admin-related schemas
class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    gender: Optional[str] = None
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminAppointmentResponse(BaseModel):
    id: int
    user_id: int
    name: str
    age: int
    address: str
    day: str
    month: str
    location: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AppointmentStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|completed|cancelled)$")


class AdminStatsResponse(BaseModel):
    total_users: int
    total_appointments: int
    pending_appointments: int
    confirmed_appointments: int
    completed_appointments: int
    cancelled_appointments: int
