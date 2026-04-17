"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setTokenValue] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Verification link is missing or invalid.");
      return;
    }
    setTokenValue(tokenParam);
  }, [searchParams]);

  useEffect(() => {
    if (!token) return;

    async function verify() {
      setError(null);
      setBusy(true);
      try {
        const data = await apiJson<{ access_token: string; token_type: string }>(
          "/auth/verify-email",
          {
            method: "POST",
            body: JSON.stringify({ token }),
          },
        );
        setToken(data.access_token);
        setSuccess("Email verified successfully. Redirecting to home...");
        setTimeout(() => {
          router.push("/");
        }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setBusy(false);
      }
    }

    verify();
  }, [router, token]);

  return (
    <div className="wrapper">
      <nav className="nav">
        <div className="nav-logo">
          <p>PRIME .</p>
        </div>
        <div className="nav-button">
          <a href="/admin/login">
            <button className="btn admin-btn" type="button">
              Admin
            </button>
          </a>
        </div>
      </nav>

      <div className="form-box">
        <div className="login-container">
          <div className="top">
            <header>Verify Your Email</header>
            <p>Please wait while we verify your email address.</p>
          </div>

          {error && <div className="auth-alert auth-alert--error">{error}</div>}
          {success && <div className="auth-alert auth-alert--success">{success}</div>}
          {!error && !success && (
            <div className="auth-alert auth-alert--info">
              {busy ? "Verifying your email..." : "Waiting for verification token..."}
            </div>
          )}

          <div className="input-box">
            <a href="/login" className="submit" style={{ textAlign: "center", display: "block" }}>
              Back to Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}