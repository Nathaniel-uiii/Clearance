"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

type ForgotPasswordStep = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<ForgotPasswordStep>("email");
  const [email, setEmail] = useState("");
  const [token, setTokenValue] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setTokenValue(tokenParam);
      setStep("reset");
    }
  }, [searchParams]);

  async function handleSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await apiJson("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccess("Reset link sent. Check your email and click the link to continue.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!token) {
      setError("Reset token is missing. Use the link in your email.");
      return;
    }

    setBusy(true);
    try {
      await apiJson("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          new_password: newPassword,
        }),
      });
      setSuccess("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrapper">
      <nav className="nav">
        <div className="nav-logo">
          <p>PRIME .</p>
        </div>
        <div className="nav-button">
          <a href="/login">
            <button className="btn admin-btn" type="button">
              Back to Login
            </button>
          </a>
        </div>
      </nav>

      <div className="form-box">
        <div className="login-container" style={{ left: "8px", opacity: 1, pointerEvents: "auto" }}>
          <div className="top">
            <span>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  router.push("/login");
                }}
              >
                Back to Login
              </a>
            </span>
            <header>Reset Password</header>
          </div>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}

          {step === "email" && (
            <form onSubmit={handleSendLink}>
              <div className="input-box input-box--stacked">
                <label className="field-label field-label--above" htmlFor="email">
                  Email Address
                </label>
                <div className="input-box__control">
                  <i className="bx bx-envelope" aria-hidden={true} />
                  <input
                    id="email"
                    type="email"
                    className="input-field"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                  />
                </div>
              </div>
              <div className="input-box">
                <button type="submit" className="submit" disabled={busy}>
                  {busy ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword}>
              <div className="input-box input-box--stacked">
                <label className="field-label field-label--above" htmlFor="new-password">
                  New Password
                </label>
                <div className="input-box__control">
                  <i className="bx bx-lock-alt" aria-hidden={true} />
                  <input
                    id="new-password"
                    type="password"
                    className="input-field"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              </div>
              <div className="input-box input-box--stacked">
                <label className="field-label field-label--above" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <div className="input-box__control">
                  <i className="bx bx-lock-alt" aria-hidden={true} />
                  <input
                    id="confirm-password"
                    type="password"
                    className="input-field"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
              <p className="field-hint" style={{ marginBottom: "15px" }}>
                Password must be at least 8 characters, include a number and special character.
              </p>
              <div className="input-box">
                <button type="submit" className="submit" disabled={busy}>
                  {busy ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
