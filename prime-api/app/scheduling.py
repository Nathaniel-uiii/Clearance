"""Resolve appointment day/month to an instant; booking lead 3h; cancel only within 3h after booking."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException

from app.config import settings

MONTH_BY_NAME: dict[str, int] = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

MIN_HOURS_BEFORE_APPOINTMENT = 3
HOURS_AFTER_BOOKING_TO_CANCEL = 3


def _tz() -> ZoneInfo:
    try:
        return ZoneInfo(settings.APPOINTMENT_TZ)
    except Exception:
        return ZoneInfo("UTC")


def resolve_appointment_start(day: str, month: str, now: datetime | None = None) -> datetime:
    """
    Next occurrence of (day, month name) at configured local wall time, as timezone-aware UTC.
    If that instant is in the past, use the following year.
    """
    tz = _tz()
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now_local = now.astimezone(tz)

    try:
        d = int(str(day).strip())
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Invalid day") from e

    m = MONTH_BY_NAME.get(str(month).strip().lower())
    if m is None:
        raise HTTPException(status_code=422, detail="Invalid month")

    if d < 1 or d > 31:
        raise HTTPException(status_code=422, detail="Invalid day")

    h = settings.APPOINTMENT_START_HOUR
    minute = settings.APPOINTMENT_START_MINUTE
    y = now_local.year

    def local_start(year: int) -> datetime:
        return datetime(year, m, d, h, minute, 0, tzinfo=tz)

    try:
        candidate = local_start(y)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Invalid date for that month") from e

    if candidate < now_local:
        try:
            candidate = local_start(y + 1)
        except ValueError as e:
            raise HTTPException(status_code=422, detail="Invalid date for that month") from e

    return candidate.astimezone(timezone.utc)


def assert_min_lead_before_start(start_utc: datetime, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    if start_utc.tzinfo is None:
        start_utc = start_utc.replace(tzinfo=timezone.utc)
    if start_utc < now + timedelta(hours=MIN_HOURS_BEFORE_APPOINTMENT):
        raise HTTPException(
            status_code=422,
            detail=(
                f"Appointment must be at least {MIN_HOURS_BEFORE_APPOINTMENT} hours "
                "from now (using scheduled date at local start time)"
            ),
        )


def assert_may_cancel(created_at_utc: datetime, now: datetime | None = None) -> None:
    """Cancellation allowed only for HOURS_AFTER_BOOKING_TO_CANCEL hours after the row was created."""
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    if created_at_utc.tzinfo is None:
        created_at_utc = created_at_utc.replace(tzinfo=timezone.utc)
    deadline = created_at_utc + timedelta(hours=HOURS_AFTER_BOOKING_TO_CANCEL)
    if now > deadline:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cancellation is only allowed within {HOURS_AFTER_BOOKING_TO_CANCEL} hours "
                "after booking"
            ),
        )
