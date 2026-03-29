"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiJson<{ access_token: string; token_type: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      setToken(data.access_token);
      router.push("/");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Login failed");
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
              className="input-field"
              placeholder=" "
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="field-label" htmlFor="admin-email">
              Admin Email
            </label>
            <i className="bx bx-user" />
          </div>
          <div className="input-box input-box--float">
            <input
              id="admin-password"
              type="password"
              name="password"
              className="input-field"
              placeholder=" "
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="field-label" htmlFor="admin-password">
              Password
            </label>
            <i className="bx bx-lock-alt" />
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
