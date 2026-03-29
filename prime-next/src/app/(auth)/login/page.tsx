"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiJson } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regQ1, setRegQ1] = useState("");
  const [regQ2, setRegQ2] = useState("");

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
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      await apiJson("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: regName,
          gender: regGender || null,
          email: regEmail,
          password: regPassword,
          security_q1: regQ1 || null,
          security_q2: regQ2 || null,
        }),
      });
      setSuccess("Registered successfully. Please log in.");
      setMode("login");
      setLoginEmail(regEmail);
      setLoginPassword("");
      setRegPassword("");
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

            <div className="input-box input-box--float">
              <input
                id="login-email"
                type="email"
                name="email"
                className="input-field"
                placeholder=" "
                autoComplete="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <label className="field-label" htmlFor="login-email">
                Email Address
              </label>
              <i className="bx bx-user" />
            </div>
            <div className="input-box input-box--float">
              <input
                id="login-password"
                type="password"
                name="password"
                className="input-field"
                placeholder=" "
                autoComplete="current-password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <label className="field-label" htmlFor="login-password">
                Password
              </label>
              <i className="bx bx-lock-alt" />
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
                  <a href="#">Forgot password?</a>
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
              <div className="input-box input-box--float">
                <input
                  id="reg-name"
                  type="text"
                  name="User"
                  className="input-field"
                  placeholder=" "
                  autoComplete="name"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                />
                <label className="field-label" htmlFor="reg-name">
                  Full Name
                </label>
                <i className="bx bx-user" />
              </div>
              <div className="input-box input-box--float input-box--float-select">
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
                <label className="field-label" htmlFor="reg-gender">
                  Gender
                </label>
              </div>
            </div>
            <div className="input-box input-box--float">
              <input
                id="reg-email"
                type="email"
                name="email"
                className="input-field"
                placeholder=" "
                autoComplete="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
              />
              <label className="field-label" htmlFor="reg-email">
                Email
              </label>
              <i className="bx bx-envelope" />
            </div>
            <div className="input-box input-box--float">
              <input
                id="reg-password"
                type="password"
                name="password"
                className="input-field"
                placeholder=" "
                autoComplete="new-password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
              />
              <label className="field-label" htmlFor="reg-password">
                Password
              </label>
              <i className="bx bx-lock-alt" />
            </div>
            <div className="input-box input-box--float">
              <input
                id="reg-q1"
                type="text"
                name="security_q1"
                className="input-field"
                placeholder=" "
                autoComplete="off"
                value={regQ1}
                onChange={(e) => setRegQ1(e.target.value)}
              />
              <label className="field-label" htmlFor="reg-q1">
                What was your first pet&apos;s name?
              </label>
              <i className="bx bx-question-mark" />
            </div>
            <div className="input-box input-box--float">
              <input
                id="reg-q2"
                type="text"
                name="security_q2"
                className="input-field"
                placeholder=" "
                autoComplete="off"
                value={regQ2}
                onChange={(e) => setRegQ2(e.target.value)}
              />
              <label className="field-label" htmlFor="reg-q2">
                In which city were you born?
              </label>
              <i className="bx bx-question-mark" />
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
