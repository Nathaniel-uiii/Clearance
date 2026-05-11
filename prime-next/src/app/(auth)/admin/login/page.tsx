"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";
import { setAdminToken, clearAdminToken } from "@/lib/auth";
import { validateEmailAddress, validateRequired } from "@/lib/baldomarValidation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const nextEmailError = validateEmailAddress(email);
    const nextPasswordError = validateRequired(password, "Password");
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setMessage(nextEmailError ?? nextPasswordError);
      return;
    }
    setBusy(true);
    try {
      const data = await apiJson<{ access_token: string; token_type: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      const token = data.access_token;
      setAdminToken(token);

      const me = await apiJson<{ is_admin: boolean }>("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!me.is_admin) {
        clearAdminToken();
        setMessage("Admin access required");
        setEmailError("This account does not have admin access.");
        return;
      }

      router.push("/admin");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setMessage(errorMessage);
      const normalized = errorMessage.toLowerCase();
      if (normalized.includes("email") || normalized.includes("registered")) {
        setEmailError(errorMessage);
      } else if (normalized.includes("password")) {
        setPasswordError(errorMessage);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrapper">
      <div className="admin-login-container">
        <div className="admin-header">
          <h2>Admin Login</h2>
        </div>

        {message ? <div className="alert">{message}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="input-box input-box--float">
            <input
              id="admin-email"
              type="email"
              name="email"
              className={`input-field ${emailError ? "input-field--error" : ""}`}
              placeholder=" "
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(validateEmailAddress(e.target.value));
                setMessage(null);
              }}
              onBlur={() => setEmailError(validateEmailAddress(email))}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "admin-email-error" : undefined}
              required
            />
            <label className="field-label" htmlFor="admin-email">
              Admin Email
            </label>
            <i className="bx bx-user" />
            {emailError ? (
              <div className="field-error" id="admin-email-error">
                {emailError}
              </div>
            ) : null}
          </div>
          <div className="input-box input-box--float">
            <input
              id="admin-password"
              type="password"
              name="password"
              className={`input-field ${passwordError ? "input-field--error" : ""}`}
              placeholder=" "
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(validateRequired(e.target.value, "Password"));
                setMessage(null);
              }}
              onBlur={() => setPasswordError(validateRequired(password, "Password"))}
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? "admin-password-error" : undefined}
              required
            />
            <label className="field-label" htmlFor="admin-password">
              Password
            </label>
            <i className="bx bx-lock-alt" />
            {passwordError ? (
              <div className="field-error" id="admin-password-error">
                {passwordError}
              </div>
            ) : null}
          </div>
          <div className="input-box">
            <button type="submit" className="submit" disabled={busy}>
              {busy ? "Logging in..." : "Login"}
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 15 }}>
            <a href="/login" style={{ color: "#fff", textDecoration: "none" }}>
              Back to Main Page
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
