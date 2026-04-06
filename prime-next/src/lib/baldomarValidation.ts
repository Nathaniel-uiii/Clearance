/**
 * Client-side mirrors of Baldomar,Galapate_Final Project + prime-api baldomar_validation.py
 */

export const MIN_PASSWORD_UTF8_BYTES = 8;
export const MAX_PASSWORD_UTF8_BYTES = 72;

export function validatePersonName(name: string, field = "Name"): string | null {
  const n = name.trim();
  if (!n) return `${field} is required.`;
  if (/[^a-zA-Z\s\-']/.test(n)) return `${field} contains invalid characters.`;
  if (/[A-Z]{2,}/.test(n) && n.toUpperCase() === n && /[A-Z]/.test(n)) {
    return `${field} must not be ALL CAPS.`;
  }
  if (/\s{2,}/.test(n)) return `${field} must not contain double spaces.`;
  if (/(.)\1{2,}/i.test(n)) {
    return `${field} must not contain three (3) consecutive identical letters.`;
  }
  const words = n.split(/\s+/);
  for (const w of words) {
    if (!w) continue;
    const first = w.charAt(0);
    const rest = w.slice(1);
    if (first !== first.toUpperCase() || (rest && rest !== rest.toLowerCase())) {
      return `${field} must be Capitalized properly. Example: Juan Carlo`;
    }
  }
  return null;
}

export function validateAddressLine(value: string, field: string): string | null {
  const v = value.trim();
  if (!v) return `${field} is required.`;
  if (/[^A-Za-z0-9\s\-\.,']/.test(v)) return `${field} contains invalid characters.`;
  if (/\s{2,}/.test(v)) return `${field} must not contain double spaces.`;
  if (/(.)\1{2,}/i.test(v)) {
    return `${field} must not contain three (3) consecutive identical letters.`;
  }
  const first = v.charAt(0);
  if (first !== first.toUpperCase() || !/[A-Z]/.test(first)) {
    return `${field} must start with a capital letter.`;
  }
  return null;
}

const PASSWORD_SPECIAL_RE = /[!@#$%^&*(),.?":{}|<>]/;

export function validatePasswordBaldomar(password: string): string | null {
  const enc = new TextEncoder().encode(password);
  if (enc.length < MIN_PASSWORD_UTF8_BYTES) {
    return "Password must be at least 8 characters.";
  }
  if (enc.length > MAX_PASSWORD_UTF8_BYTES) {
    return "Password must be at most 72 bytes (bcrypt limit).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number (0-9).";
  }
  if (!PASSWORD_SPECIAL_RE.test(password)) {
    return (
      'Password must include at least one special character ' +
      '(e.g. ! @ # $ % ^ & * ( ) , . ? " : { } | < >).'
    );
  }
  return null;
}

export function validateOptionalSecurityAnswer(
  value: string | null | undefined,
  field: string,
): string | null {
  if (value == null || value === "") return null;
  const s = value.trim();
  if (!s) return `${field} cannot be only whitespace.`;
  if (s.length > 2000) return `${field} is too long.`;
  return null;
}

export function validateGender(value: string | null | undefined): string | null {
  if (value == null || value === "") return null;
  if (value !== "Male" && value !== "Female") {
    return "Gender must be Male or Female.";
  }
  return null;
}

export function validateRegisterForm(input: {
  fullName: string;
  email: string;
  password: string;
  gender: string;
  securityQ1: string;
  securityQ2: string;
}): string | null {
  const nameErr = validatePersonName(input.fullName, "Full name");
  if (nameErr) return nameErr;
  if (!input.gender?.trim()) return "Gender is required.";
  const genderErr = validateGender(input.gender);
  if (genderErr) return genderErr;
  const pwErr = validatePasswordBaldomar(input.password);
  if (pwErr) return pwErr;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Please enter a valid email address.";
  }
  if (!input.securityQ1?.trim()) return "Security answer 1 is required.";
  if (!input.securityQ2?.trim()) return "Security answer 2 is required.";
  const s1 = validateOptionalSecurityAnswer(input.securityQ1, "Security answer 1");
  if (s1) return s1;
  const s2 = validateOptionalSecurityAnswer(input.securityQ2, "Security answer 2");
  if (s2) return s2;
  return null;
}

export function validateAppointmentBaldomar(input: {
  fullName: string;
  address: string;
  location: string;
  age: number;
}): string | null {
  const nameErr = validatePersonName(input.fullName, "Name");
  if (nameErr) return nameErr;
  if (!Number.isFinite(input.age) || input.age < 18) {
    return "You must be 18 years or older.";
  }
  const addrErr = validateAddressLine(input.address, "Address");
  if (addrErr) return addrErr;
  const locErr = validateAddressLine(input.location, "Location");
  if (locErr) return locErr;
  return null;
}
