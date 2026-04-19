"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiJson } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { validateRegisterForm } from "@/lib/baldomarValidation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState(false);
  const [loginPasswordError, setLoginPasswordError] = useState(false);
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const styles = useMemo(() => {
    const isLogin = mode === "login";
    return {
      login: {
        left: isLogin ? "8px" : "-520px",
        opacity: isLogin ? 1 : 0,
        pointerEvents: isLogin ? ("auto" as const) : ("none" as const),
      },
      register: {
        right: isLogin ? "-528px" : "8px",
        opacity: isLogin ? 0 : 1,
        pointerEvents: isLogin ? ("none" as const) : ("auto" as const),
      },
    };
  }, [mode]);

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoginEmailError(false);
    setLoginPasswordError(false);
    setBusy(true);
    try {
      const data = await apiJson<{ access_token: string; token_type: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        },
      );
      setToken(data.access_token);
      router.push("/");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Login failed";
      setError(errorMsg);

      const normalizedErrorMsg = errorMsg.toLowerCase();
      if (normalizedErrorMsg.includes("not registered")) {
        setLoginEmailError(true);
        setLoginPasswordError(false);
      } else if (normalizedErrorMsg.includes("wrong password")) {
        setLoginPasswordError(true);
        setLoginEmailError(false);
      } else if (normalizedErrorMsg.includes("verify your email")) {
        setLoginEmailError(true);
        setLoginPasswordError(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const regErr = validateRegisterForm({
      fullName: regName,
      email: regEmail,
      password: regPassword,
      gender: regGender,
    });
    if (regErr) {
      setError(regErr);
      return;
    }
    setBusy(true);
    try {
      await apiJson("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: regName,
          gender: regGender || null,
          email: regEmail,
          password: regPassword,
        }),
      });
      setSuccess(
        "Registration successful. Check your email for a verification link to complete signup."
      );
      setMode("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Register failed");
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
          <a href="/admin/login">
            <button className="btn admin-btn" type="button">
              Admin
            </button>
          </a>
        </div>
      </nav>

      <div className="form-box">
        <form onSubmit={onLoginSubmit}>
          <div
            className="login-container"
            id="login"
            style={styles.login}
          >
            <div className="top">
              <span>
                Don&apos;t have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setSuccess(null);
                    setMode("register");
                  }}
                >
                  Sign Up
                </a>
              </span>
              <header>Login</header>
            </div>

            {error && mode === "login" ? (
              <div className="auth-alert auth-alert--error">{error}</div>
            ) : null}
            {success && mode === "login" ? (
              <div className="auth-alert auth-alert--success">{success}</div>
            ) : null}

            <div className="input-box input-box--stacked">
              <label className="field-label field-label--above" htmlFor="login-email">
                Email Address
              </label>
              <div className="input-box__control">
                <i className="bx bx-user" aria-hidden={true} />
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  className={`input-field ${loginEmailError ? "input-field--error" : ""}`}
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    if (loginEmailError) {
                      setLoginEmailError(false);
                      setError(null);
                    }
                  }}
                />
              </div>
              {loginEmailError && error && (
                <div className="field-error">{error}</div>
              )}
            </div>
            <div className="input-box input-box--stacked">
              <label className="field-label field-label--above" htmlFor="login-password">
                Password
              </label>
              <div className="input-box__control">
                <i className="bx bx-lock-alt" aria-hidden={true} />
                <input
                  id="login-password"
                  type="password"
                  name="password"
                  className={`input-field ${loginPasswordError ? "input-field--error" : ""}`}
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginPasswordError) {
                      setLoginPasswordError(false);
                      setError(null);
                    }
                  }}
                />
              </div>
              {loginPasswordError && error && (
                <div className="field-error">{error}</div>
              )}
            </div>
            <div className="input-box">
              <button type="submit" className="submit" disabled={busy}>
                {busy ? "Signing in..." : "Sign In"}
              </button>
            </div>
            <div className="two-col">
              <div className="one">
                <input type="checkbox" id="login-check" name="login-check" />
                <label htmlFor="login-check"> Remember Me</label>
              </div>
              <div className="two">
                <label>
                  <a href="/forgot-password">Forgot password?</a>
                </label>
              </div>
            </div>
          </div>
        </form>

        <form className="and" onSubmit={onRegisterSubmit}>
          <div
            className="register-container"
            id="register"
            style={styles.register}
          >
            <div className="top">
              <span>
                Have an account?{" "}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setError(null);
                    setSuccess(null);
                    setMode("login");
                  }}
                >
                  Login
                </a>
              </span>
              <header>Sign Up</header>
            </div>

            {error && mode === "register" ? (
              <div className="auth-alert auth-alert--error">{error}</div>
            ) : null}
            {success && mode === "register" ? (
              <div className="auth-alert auth-alert--success">{success}</div>
            ) : null}

            <div className="two-forms">
              <div className="input-box input-box--stacked">
                <label className="field-label field-label--above" htmlFor="reg-name">
                  Full Name
                </label>
                <div className="input-box__control">
                  <i className="bx bx-user" aria-hidden={true} />
                  <input
                    id="reg-name"
                    type="text"
                    name="User"
                    className="input-field"
                    autoComplete="name"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
              </div>
              <div className="input-box input-box--stacked input-box--stacked-select">
                <label className="field-label field-label--above" htmlFor="reg-gender">
                  Gender
                </label>
                <select
                  id="reg-gender"
                  name="gender"
                  className="input-field"
                  required
                  value={regGender}
                  onChange={(e) => setRegGender(e.target.value)}
                  aria-label="Gender"
                >
                  <option value="" disabled>
                    {"\u00a0"}
                  </option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
            <div className="input-box input-box--stacked">
              <label className="field-label field-label--above" htmlFor="reg-email">
                Email
              </label>
              <div className="input-box__control">
                <i className="bx bx-envelope" aria-hidden={true} />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  className="input-field"
                  autoComplete="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="input-box input-box--stacked">
              <label className="field-label field-label--above" htmlFor="reg-password">
                Password
              </label>
              <div className="input-box__control">
                <i className="bx bx-lock-alt" aria-hidden={true} />
                <input
                  id="reg-password"
                  type="password"
                  name="password"
                  className="input-field"
                  autoComplete="new-password"
                  required
                  aria-describedby="reg-password-hint"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
              <p className="field-hint" id="reg-password-hint">
                At least 8 characters, max 72 bytes. Include at least one number and one special
                character (!@#$%^&amp;* etc.).
              </p>
            </div>
            <div className="input-box">
              <input
                type="submit"
                className="submit"
                value={busy ? "Registering..." : "Register"}
                disabled={busy}
              />
            </div>
            <div className="two-col">
              <div className="one">
                <input type="checkbox" id="register-check" />
                <label htmlFor="register-check"> Remember Me</label>
              </div>
              <div className="two">
                <label>
                  <a href="#">Terms & conditions</a>
                </label>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
