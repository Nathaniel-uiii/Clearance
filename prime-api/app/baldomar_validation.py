"""
Validation rules aligned with Baldomar,Galapate_Final Project (signup_process.php + validation.js).
"""

from __future__ import annotations

import re
from typing import Optional

MAX_PASSWORD_UTF8_BYTES = 72
MIN_PASSWORD_UTF8_BYTES = 8
_PASSWORD_SPECIAL_RE = re.compile(r'[!@#$%^&*(),.?":{}|<>]')


def validate_person_name(name: str, field: str = "Name") -> Optional[str]:
    """Letters, spaces, hyphen, apostrophe; title case per word; no ALL CAPS / double spaces / triple letters."""
    name = (name or "").strip()
    if not name:
        return f"{field} is required."
    if re.search(r"[^a-zA-Z\s\-']", name):
        return f"{field} contains invalid characters."
    if re.search(r"[A-Z]{2,}", name) and name.upper() == name and re.search(r"[A-Z]", name):
        return f"{field} must not be ALL CAPS."
    if "  " in name:
        return f"{field} must not contain double spaces."
    if re.search(r"(.)\1{2,}", name, re.IGNORECASE):
        return f"{field} must not contain three (3) consecutive identical letters."
    for w in name.split():
        if not w:
            continue
        first, rest = w[0], w[1:]
        if first.upper() != first or (rest and rest.lower() != rest):
            return f"{field} must be Capitalized properly. Example: Juan Carlo"
    return None


def validate_address_line(value: str, field: str) -> Optional[str]:
    """Street-style lines: alnum, spaces, hyphen, comma, period, apostrophe; capital start; no double spaces."""
    v = (value or "").strip()
    if not v:
        return f"{field} is required."
    if re.search(r"[^A-Za-z0-9\s\-\.,']", v):
        return f"{field} contains invalid characters."
    if "  " in v:
        return f"{field} must not contain double spaces."
    if re.search(r"(.)\1{2,}", v, re.IGNORECASE):
        return f"{field} must not contain three (3) consecutive identical letters."
    first = v[0]
    if first != first.upper() or not re.search(r"[A-Z]", first):
        return f"{field} must start with a capital letter."
    return None


def validate_password_baldomar(password: str) -> Optional[str]:
    """Min 8 UTF-8 bytes, max 72 (bcrypt); must include at least one number and one special character."""
    raw = password.encode("utf-8")
    if len(raw) < MIN_PASSWORD_UTF8_BYTES:
        return "Password must be at least 8 characters."
    if len(raw) > MAX_PASSWORD_UTF8_BYTES:
        return "Password must be at most 72 bytes (bcrypt limit)."
    if not re.search(r"[0-9]", password):
        return "Password must include at least one number (0-9)."
    if not _PASSWORD_SPECIAL_RE.search(password):
        return (
            "Password must include at least one special character "
            '(e.g. ! @ # $ % ^ & * ( ) , . ? " : { } | < >).'
        )
    return None


def validate_optional_security_answer(value: Optional[str], field: str) -> Optional[str]:
    if value is None or value == "":
        return None
    s = value.strip()
    if not s:
        return f"{field} cannot be only whitespace."
    if len(s) > 2000:
        return f"{field} is too long."
    return None


def validate_gender_optional(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return None
    if value not in ("Male", "Female"):
        return "Gender must be Male or Female."
    return None
