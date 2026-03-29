"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiJson, authHeaders } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";

const MONTHLY_APPOINTMENT_LIMIT = 5;
const CANCEL_WINDOW_MS = 3 * 60 * 60 * 1000;

export type Appointment = {
  id: number;
  name: string;
  age: number;
  address: string;
  day: string;
  month: string;
  location: string;
  status: string;
  created_at: string;
};

function normalizeAppointmentRow(raw: Record<string, unknown>): Appointment | null {
  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;
  const age = Number(raw.age);
  let createdAt = "";
  const ca = raw.created_at;
  if (typeof ca === "string") createdAt = ca;
  else if (ca != null) createdAt = String(ca);
  return {
    id,
    name: String(raw.name ?? ""),
    age: Number.isFinite(age) ? age : 0,
    address: String(raw.address ?? ""),
    day: String(raw.day ?? ""),
    month: String(raw.month ?? ""),
    location: String(raw.location ?? ""),
    status: String(raw.status ?? "pending"),
    created_at: createdAt,
  };
}

function normalizeAppointmentList(data: unknown): Appointment[] {
  if (!Array.isArray(data)) return [];
  const out: Appointment[] = [];
  for (const row of data) {
    if (row && typeof row === "object") {
      const a = normalizeAppointmentRow(row as Record<string, unknown>);
      if (a) out.push(a);
    }
  }
  return out;
}

function secondsUntilCancelDeadline(createdAt: string, now: number): number {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return 0;
  const end = t + CANCEL_WINDOW_MS;
  return Math.max(0, Math.floor((end - now) / 1000));
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function statusPillLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "done" || s === "completed") return "DONE";
  if (s === "cancelled") return "CANCELLED";
  if (s === "pending") return "PENDING";
  return status.toUpperCase();
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "done" || s === "completed") return "status-badge status-done";
  if (s === "cancelled") return "status-badge status-cancelled";
  if (s === "pending") return "status-badge status-pending";
  return `status-badge status-${s.replace(/\s+/g, "-")}`;
}

export default function SiteHomePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tick, setTick] = useState(0);
  const [apptBusy, setApptBusy] = useState(false);
  const [apptError, setApptError] = useState<string | null>(null);
  const [apptSuccess, setApptSuccess] = useState<string | null>(null);
  const appointmentsListRef = useRef<HTMLDivElement>(null);

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [day, setDay] = useState<number | "">("");
  const [month, setMonth] = useState("");
  const [location, setLocation] = useState("");

  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  const months = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    [],
  );

  useEffect(() => {
    setIsAuthed(Boolean(getToken()));
  }, [pathname]);

  const loadAppointments = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setAppointments([]);
      return;
    }
    try {
      const raw = await apiJson<unknown>("/appointments", {
        headers: authHeaders(token),
      });
      const list = normalizeAppointmentList(raw);
      setAppointments(list);
    } catch {
      /* Keep existing rows on failure. */
    }
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== "prime_token") return;
      setIsAuthed(Boolean(getToken()));
      if (e.newValue) void loadAppointments();
      else setAppointments([]);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadAppointments]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (!getToken()) return;
      void loadAppointments();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadAppointments]);

  /** Ensures a row returned from POST is present after GET (same order as API: newest first). */
  function mergeCreatedIntoList(
    list: Appointment[],
    created: Appointment,
  ): Appointment[] {
    const has = list.some((a) => a.id === created.id);
    const merged = has ? list : [created, ...list];
    return [...merged].sort((a, b) => {
      const tb = new Date(b.created_at).getTime();
      const ta = new Date(a.created_at).getTime();
      if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta;
      return b.id - a.id;
    });
  }

  useEffect(() => {
    if (!isAuthed) {
      setAppointments([]);
      return;
    }
    void loadAppointments();
  }, [isAuthed, loadAppointments]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const monthlyUsed = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    return appointments.filter((a) => {
      if (a.status === "cancelled") return false;
      const d = new Date(a.created_at);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() + 1 === mo;
    }).length;
  }, [appointments]);

  const completedThisMonth = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const mo = now.getMonth() + 1;
    return appointments.filter((a) => {
      const s = a.status.toLowerCase();
      if (s !== "done" && s !== "completed") return false;
      const d = new Date(a.created_at);
      return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() + 1 === mo;
    }).length;
  }, [appointments]);

  const monthlyRemaining = Math.max(0, MONTHLY_APPOINTMENT_LIMIT - monthlyUsed);

  async function submitAppointment(e: FormEvent) {
    e.preventDefault();
    setApptError(null);
    setApptSuccess(null);
    const token = getToken();
    if (!token) {
      setApptError("Please log in to book an appointment.");
      return;
    }
    setApptBusy(true);
    try {
      const raw = await apiJson<unknown>("/appointments", {
        method: "POST",
        headers: { ...authHeaders(token) },
        body: JSON.stringify({
          name: fullName,
          age: Number(age),
          address,
          day: String(day),
          month,
          location,
        }),
      });
      const created =
        raw && typeof raw === "object"
          ? normalizeAppointmentRow(raw as Record<string, unknown>)
          : null;
      setFullName("");
      setAge("");
      setAddress("");
      setDay("");
      setMonth("");
      setLocation("");
      if (!created) {
        setApptError("Booking saved but response was invalid. Refresh the page.");
        await loadAppointments();
        return;
      }
      try {
        const listRaw = await apiJson<unknown>("/appointments", {
          headers: authHeaders(token),
        });
        const list = normalizeAppointmentList(listRaw);
        setAppointments(mergeCreatedIntoList(list, created));
      } catch {
        setAppointments((prev) => {
          const rest = prev.filter((a) => a.id !== created.id);
          return [created, ...rest];
        });
      }
      setApptSuccess("Appointment saved — it appears in Your Appointments.");
      window.setTimeout(() => setApptSuccess(null), 6000);
      appointmentsListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setApptError(err instanceof Error ? err.message : "Could not create appointment.");
    } finally {
      setApptBusy(false);
    }
  }

  async function cancelAppointment(id: number) {
    const token = getToken();
    if (!token) return;
    setApptError(null);
    try {
      await apiJson(`/appointments/${id}/cancel`, {
        method: "POST",
        headers: { ...authHeaders(token) },
      });
      await loadAppointments();
    } catch (err: unknown) {
      setApptError(err instanceof Error ? err.message : "Could not cancel.");
    }
  }

  void tick;

  useEffect(() => {
    const sections = document.querySelectorAll("section");
    sections.forEach((section) => section.classList.add("pop-animation"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );

    const cards = document.querySelectorAll(
      ".service-card, .team-card, .appointment-card",
    );
    const inputBoxes = document.querySelectorAll(".contact .input-box");

    [...sections, ...cards, ...inputBoxes].forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div>
      <nav className="nav">
        <div className="nav-logo">
          <a href="#home">PRIME .</a>
        </div>
        <div className="nav-menu" id="navMenu">
          <ul>
            <li>
              <a href="#home" className="link">
                Home
              </a>
            </li>
            <li>
              <a href="#services" className="link">
                Services
              </a>
            </li>
            <li>
              <a href="#book" className="link">
                Book
              </a>
            </li>
            <li>
              <a href="#team" className="link">
                Team
              </a>
            </li>
            <li>
              <a href="#contact" className="link">
                Contact
              </a>
            </li>
            <li>
              {isAuthed ? (
                <a
                  href="#"
                  className="link"
                  onClick={(e) => {
                    e.preventDefault();
                    clearToken();
                    setIsAuthed(false);
                    router.push("/login");
                  }}
                >
                  Log Out
                </a>
              ) : (
                <a href="/login" className="link">
                  Log In
                </a>
              )}
            </li>
          </ul>
        </div>
      </nav>

      <section id="home" className="home">
        <div className="content">
          <h1>
            Welcome to <span>PRIME .</span>
          </h1>
          <p>
            Experience seamless barangay clearance processing with our innovative
            booking system. Schedule appointments, submit documents, and receive
            your clearance - all in one place.
          </p>
          <div className="home-buttons">
            <a href="#book" className="primary-btn">
              Book Now
            </a>
            <a href="#services" className="secondary-btn">
              Learn More
            </a>
          </div>
          <div className="home-features">
            <div className="feature">
              <i className="bx bx-calendar-check" />
              <span>Easy Booking</span>
            </div>
            <div className="feature">
              <i className="bx bx-time" />
              <span>24/7 Service</span>
            </div>
            <div className="feature">
              <i className="bx bx-shield-check" />
              <span>Secure Process</span>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="services-section">
        <div className="services-container">
          <h2 className="services-title">Our Services</h2>
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                <i className="bx bx-calendar-check" />
              </div>
              <div className="service-content">
                <h3>Appointment Scheduling</h3>
                <p>
                  Easy and convenient online appointment booking system with
                  automated reminders.
                </p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="bx bx-user-voice" />
              </div>
              <div className="service-content">
                <h3>Customer Support</h3>
                <p>
                  24/7 customer support to assist with any questions or concerns
                  about your appointments.
                </p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="bx bx-file" />
              </div>
              <div className="service-content">
                <h3>Document Management</h3>
                <p>
                  Secure storage and management of all your important documents
                  and records.
                </p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="bx bx-line-chart" />
              </div>
              <div className="service-content">
                <h3>Analytics & Reports</h3>
                <p>
                  Detailed analytics and reports to help you track and manage
                  your appointments.
                </p>
              </div>
            </div>

            <div className="service-card">
              <div className="service-icon">
                <i className="bx bx-lock-alt" />
              </div>
              <div className="service-content">
                <h3>Secure Data</h3>
                <p>
                  Your personal information and appointment details are kept
                  secure with our advanced encryption.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="book" className="book-section">
        <div className="book-container">
          <div className="appointment-form">
            <form onSubmit={submitAppointment}>
              <div className="form-box">
                <h1>Make An Appointment</h1>
                {apptError ? <div className="book-error">{apptError}</div> : null}
                {apptSuccess ? (
                  <div className="book-success" role="status">
                    {apptSuccess}
                  </div>
                ) : null}
                <div className="form-grid">
                  <div className="input-box">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      className="input-field"
                      name="name"
                      placeholder="Enter Your Full Name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="input-box">
                    <label htmlFor="age">Age</label>
                    <input
                      type="number"
                      id="age"
                      className="input-field"
                      name="age"
                      placeholder="Enter Your Age"
                      min={1}
                      max={120}
                      required
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>

                  <div className="input-box">
                    <label htmlFor="address">Address</label>
                    <select
                      id="address"
                      className="input-field custom-select"
                      name="address"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    >
                      <option value="">Select Your Address</option>
                      <option value="Antonio Luna">Antonio Luna</option>
                      <option value="Bay-ang">Bay-ang</option>
                      <option value="Bayabas">Bayabas</option>
                      <option value="Caasinan">Caasinan</option>
                      <option value="Cabinet">Cabinet</option>
                      <option value="Calamba">Calamba</option>
                      <option value="Calibunan">Calibunan</option>
                      <option value="Comagascas">Comagascas</option>
                      <option value="Concepcion">Concepcion</option>
                      <option value="Del Pilar">Del Pilar</option>
                      <option value="Katugasan">Katugasan</option>
                      <option value="Kauswagan">Kauswagan</option>
                      <option value="La Union">La Union</option>
                      <option value="Mabini">Mabini</option>
                      <option value="Mahaba">Mahaba</option>
                      <option value="Poblacion 1">Poblacion 1</option>
                      <option value="Poblacion 2">Poblacion 2</option>
                      <option value="Poblacion 3">Poblacion 3</option>
                      <option value="Poblacion 4">Poblacion 4</option>
                      <option value="Poblacion 5">Poblacion 5</option>
                      <option value="Poblacion 6">Poblacion 6</option>
                      <option value="Poblacion 7">Poblacion 7</option>
                      <option value="Poblacion 8">Poblacion 8</option>
                      <option value="Poblacion 9">Poblacion 9</option>
                      <option value="Poblacion 10">Poblacion 10</option>
                      <option value="Poblacion 11">Poblacion 11</option>
                      <option value="Poblacion 12">Poblacion 12</option>
                      <option value="Puting Bato">Puting Bato</option>
                      <option value="Sanghan">Sanghan</option>
                      <option value="Soriano">Soriano</option>
                      <option value="Tolosa">Tolosa</option>
                    </select>
                  </div>

                  <div className="input-box">
                    <label htmlFor="day">Day</label>
                    <select
                      id="day"
                      className="input-field custom-select"
                      name="day"
                      required
                      value={day === "" ? "" : String(day)}
                      onChange={(e) =>
                        setDay(e.target.value === "" ? "" : Number(e.target.value))
                      }
                    >
                      <option value="">Select Date</option>
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-box">
                    <label htmlFor="month">Month</label>
                    <select
                      id="month"
                      className="input-field custom-select"
                      name="month"
                      required
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      <option value="">Select Month</option>
                      {months.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-box">
                    <label htmlFor="location">Location</label>
                    <select
                      id="location"
                      className="input-field custom-select"
                      name="location"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    >
                      <option value="">Select Location</option>
                      <option value="Antonio Luna, Cabadbaran City">
                        Antonio Luna, Cabadbaran City
                      </option>
                      <option value="Bay-ang, Cabadbaran City">
                        Bay-ang, Cabadbaran City
                      </option>
                      <option value="Bayabas, Cabadbaran City">
                        Bayabas, Cabadbaran City
                      </option>
                      <option value="Caasinan, Cabadbaran City">
                        Caasinan, Cabadbaran City
                      </option>
                      <option value="Cabinet, Cabadbaran City">
                        Cabinet, Cabadbaran City
                      </option>
                      <option value="Calamba, Cabadbaran City">
                        Calamba, Cabadbaran City
                      </option>
                      <option value="Calibunan, Cabadbaran City">
                        Calibunan, Cabadbaran City
                      </option>
                      <option value="Comagascas, Cabadbaran City">
                        Comagascas, Cabadbaran City
                      </option>
                      <option value="Concepcion, Cabadbaran City">
                        Concepcion, Cabadbaran City
                      </option>
                      <option value="Del Pilar, Cabadbaran City">
                        Del Pilar, Cabadbaran City
                      </option>
                      <option value="Katugasan, Cabadbaran City">
                        Katugasan, Cabadbaran City
                      </option>
                      <option value="Kauswagan, Cabadbaran City">
                        Kauswagan, Cabadbaran City
                      </option>
                      <option value="La Union, Cabadbaran City">
                        La Union, Cabadbaran City
                      </option>
                      <option value="Mabini, Cabadbaran City">
                        Mabini, Cabadbaran City
                      </option>
                      <option value="Mahaba, Cabadbaran City">
                        Mahaba, Cabadbaran City
                      </option>
                      <option value="Poblacion 1, Cabadbaran City">
                        Poblacion 1, Cabadbaran City
                      </option>
                      <option value="Poblacion 2, Cabadbaran City">
                        Poblacion 2, Cabadbaran City
                      </option>
                      <option value="Poblacion 3, Cabadbaran City">
                        Poblacion 3, Cabadbaran City
                      </option>
                      <option value="Poblacion 4, Cabadbaran City">
                        Poblacion 4, Cabadbaran City
                      </option>
                      <option value="Poblacion 5, Cabadbaran City">
                        Poblacion 5, Cabadbaran City
                      </option>
                      <option value="Poblacion 6, Cabadbaran City">
                        Poblacion 6, Cabadbaran City
                      </option>
                      <option value="Poblacion 7, Cabadbaran City">
                        Poblacion 7, Cabadbaran City
                      </option>
                      <option value="Poblacion 8, Cabadbaran City">
                        Poblacion 8, Cabadbaran City
                      </option>
                      <option value="Poblacion 9, Cabadbaran City">
                        Poblacion 9, Cabadbaran City
                      </option>
                      <option value="Poblacion 10, Cabadbaran City">
                        Poblacion 10, Cabadbaran City
                      </option>
                      <option value="Poblacion 11, Cabadbaran City">
                        Poblacion 11, Cabadbaran City
                      </option>
                      <option value="Poblacion 12, Cabadbaran City">
                        Poblacion 12, Cabadbaran City
                      </option>
                      <option value="Puting Bato, Cabadbaran City">
                        Puting Bato, Cabadbaran City
                      </option>
                      <option value="Sanghan, Cabadbaran City">
                        Sanghan, Cabadbaran City
                      </option>
                      <option value="Soriano, Cabadbaran City">
                        Soriano, Cabadbaran City
                      </option>
                      <option value="Tolosa, Cabadbaran City">
                        Tolosa, Cabadbaran City
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={apptBusy || monthlyRemaining <= 0}
                >
                  <span className="btn-text">
                    {apptBusy
                      ? "Submitting..."
                      : monthlyRemaining <= 0
                        ? "Monthly limit reached"
                        : "Make An Appointment"}
                  </span>
                  <span className="btn-icon">📅</span>
                </button>
              </div>
            </form>
          </div>

          <div className="right-side">
            <div className="appointment-details">
              <div className="appointments-panel-header">
                <h2 className="appointments-panel-header__title">Your Appointments</h2>
              </div>
              <div className="appointments-list" ref={appointmentsListRef}>
                {appointments.length === 0 ? (
                  <div className="no-appointments">
                    {isAuthed
                      ? "No appointments yet."
                      : "Log in to see your appointments."}
                  </div>
                ) : (
                  appointments.map((a) => {
                    const remaining = secondsUntilCancelDeadline(
                      a.created_at,
                      Date.now(),
                    );
                    const st = a.status.toLowerCase();
                    const isDone = st === "done" || st === "completed";
                    const isPending = st === "pending";
                    const canCancel = isPending && remaining > 0;
                    return (
                      <div className="appointment-card" key={a.id}>
                        <div className="appointment-header">
                          <h3>{a.name}</h3>
                          <span className={statusBadgeClass(a.status)}>
                            {statusPillLabel(a.status)}
                          </span>
                        </div>
                        <div className="appointment-divider" />
                        <div className="appointment-info">
                          <p>
                            <strong>Age:</strong> {a.age}
                          </p>
                          <p>
                            <strong>Address:</strong> {a.address}
                          </p>
                          <p>
                            <strong>Date:</strong> {a.day} {a.month}
                          </p>
                          <p>
                            <strong>Location:</strong> {a.location}
                          </p>
                          {isPending ? (
                            <div
                              className={`timer-info ${canCancel ? "timer-active" : "timer-expired"}`}
                            >
                              {canCancel ? (
                                <>
                                  <p>
                                    <i className="bx bx-time" /> Time remaining to
                                    cancel:
                                  </p>
                                  <div className="timer-countdown">
                                    {formatCountdown(remaining)}
                                  </div>
                                </>
                              ) : (
                                <p>
                                  <i className="bx bx-time-five" /> Cancellation
                                  window ended
                                </p>
                              )}
                            </div>
                          ) : null}
                        </div>
                        <div className="appointment-actions">
                          {isDone ? (
                            <button
                              type="button"
                              className="appointment-completed-btn"
                              disabled
                            >
                              Appointment Completed
                            </button>
                          ) : isPending ? (
                            <button
                              type="button"
                              className="cancel-btn"
                              disabled={!canCancel}
                              onClick={() => cancelAppointment(a.id)}
                            >
                              <i className="bx bx-x-circle" /> Cancel Appointment
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div
              className={`monthly-limit-panel ${monthlyRemaining <= 0 ? "limit-reached" : ""}`}
            >
              <h3 className="monthly-limit-panel__title">Monthly Appointment Limit</h3>
              <div className="monthly-limit-panel__stats">
                <div className="monthly-stat-row">
                  <span className="monthly-stat-label">Completed:</span>{" "}
                  <span className="monthly-stat-value">{completedThisMonth}</span>
                  <span className="monthly-stat-denom">
                    {" "}
                    / {MONTHLY_APPOINTMENT_LIMIT}
                  </span>
                </div>
                <div className="monthly-stat-row">
                  <span className="monthly-stat-label">Remaining:</span>{" "}
                  <span className="monthly-stat-value">{monthlyRemaining}</span>
                  <span className="monthly-stat-denom">
                    {" "}
                    / {MONTHLY_APPOINTMENT_LIMIT}
                  </span>
                </div>
              </div>
              <div className="monthly-limit-panel__divider" />
              <p className="monthly-limit-panel__footer">
                {monthlyRemaining <= 0
                  ? "You have reached your monthly appointment limit."
                  : `You can book ${monthlyRemaining} more appointment${monthlyRemaining === 1 ? "" : "s"} this month.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="team" className="team-section">
        <div className="team-container">
          <h2 className="team-title">Our Team</h2>
          <div className="team-cards">
            <div className="team-card">
              <div className="team-img">
                <img src="/images/nel.jpg" alt="Nathaniel Palco" />
              </div>
              <div className="team-info">
                <h3>Nathaniel Palco</h3>
                <div className="role">Lead Developer</div>
                <div className="description">
                  Leads document processing and oversees technical system
                  management.
                </div>
              </div>
            </div>

            <div className="team-card">
              <div className="team-img">
                <img src="/images/ken.jpg" alt="Kenneth Baldomar" />
              </div>
              <div className="team-info">
                <h3>Kenneth Baldomar</h3>
                <div className="role">System Administrator</div>
                <div className="description">
                  Supervises appointments and ensures user support availability.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="contact">
        <div className="contact-container">
          <div className="contact-wrapper">
            <div className="contact-info">
              <h3>Contact Information</h3>
              <p>
                <i className="bx bx-map" />
                Location:
              </p>
              <p>
                <i className="bx bx-map" />
                Cabadbaran City, Agusan del Norte, Philippines
              </p>
              <br />
              <p>
                <i className="bx bx-phone" />
                Contact Number:
              </p>
              <p>
                <i className="bx bx-phone" />
                +63 956 461 0460
              </p>
              <p>
                <i className="bx bx-phone" />
                +63 951 081 5390
              </p>
              <br />
              <p>
                <i className="bx bx-envelope" />
                Email:
              </p>
              <p>
                <i className="bx bx-envelope" />
                kenneth.baldomar@csucc.edu.ph
              </p>
              <p>
                <i className="bx bx-envelope" />
                nathaniel.palco@csucc.edu.ph
              </p>
              <p>
                <i className="bx bx-envelope" />
                jane.garzon@csucc.edu.ph
              </p>
              <p>
                <i className="bx bx-envelope" />
                mohammadmadhi.fornilos@csucc.edu.ph
              </p>
            </div>

            <form action="#" method="POST">
              <h2 className="heading">
                Contact <span>Us</span>
              </h2>
              <div className="input-group">
                <div className="input-box">
                  <input type="text" name="fullname" placeholder="Full Name" />
                </div>
                <div className="input-box">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                  />
                </div>
              </div>
              <div className="input-group">
                <div className="input-box">
                  <input type="tel" name="phone" placeholder="Phone Number" />
                </div>
                <div className="input-box">
                  <input type="text" name="subject" placeholder="Subject" />
                </div>
              </div>
              <div className="input-box">
                <textarea name="message" placeholder="Your Message" />
              </div>
              <button type="submit" className="submit-btn">
                Send Message <i className="bx bx-send" />
              </button>
            </form>
          </div>
        </div>
      </section>

      <footer>
        <p>&copy; 2026 PRIME. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

