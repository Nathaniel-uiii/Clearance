from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    gender: Optional[str] = None
    security_q1: Optional[str] = None
    security_q2: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    email: str
    username: str


class AppointmentCreateRequest(BaseModel):
    name: str
    age: int
    address: str
    day: str
    month: str
    location: str


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
