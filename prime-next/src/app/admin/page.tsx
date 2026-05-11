"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson, authHeaders } from "@/lib/api";
import { getAdminToken } from "@/lib/auth";

type TimePoint = { date: string; count: number };
type AlertItem = { level: "info" | "warning"; message: string };
type Analytics = {
  range: { days: number; start: string; end: string };
  last_updated: string;
  totals: {
    users: number;
    new_users: number;
    appointments: number;
    messages: number;
    active_users: number;
    previous_appointments: number;
    previous_users: number;
  };
  status_counts: Record<string, number>;
  document_counts: Record<string, number>;
  location_counts: Record<string, number>;
  cancellation_by_document: Record<string, number>;
  cancellation_reasons: Record<string, number>;
  appointments_over_time: TimePoint[];
  users_over_time: TimePoint[];
  kpis: {
    booking_rate: number;
    completion_rate: number;
    cancellation_rate: number;
    pending_over_three_days: number;
    average_turnaround_hours: number | null;
    average_confirmation_hours: number | null;
  };
  insights: {
    most_booked_document: { label: string; count: number };
    busiest_day: { label: string; count: number };
    busiest_location: { label: string; count: number };
    top_cancellation_reason: [string, number];
  };
  alerts: AlertItem[];
};

type Health = { ok: boolean; database: string; smtp_configured: boolean };
type DashboardTab = "overview" | "appointments" | "users" | "performance";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#2563eb",
  completed: "#16a34a",
  cancelled: "#dc2626",
};

const RANGE_OPTIONS = [
  { label: "Today", days: 1 },
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "Last 90 Days", days: 90 },
];

function pctChange(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sortedEntries(record: Record<string, number>): Array<[string, number]> {
  return Object.entries(record).sort((a, b) => b[1] - a[1]);
}

function LineChart({ points, color = "#2563eb" }: { points: TimePoint[]; color?: string }) {
  const width = 520;
  const height = 190;
  const padding = 22;
  const max = Math.max(1, ...points.map((p) => p.count));
  const xStep = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;
  const path = points
    .map((point, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (point.count / max) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg className="analytics-chart" viewBox={`0 0 ${width} ${height}`} role="img">
      <title>Appointments over time</title>
      <path d={`M ${padding} ${height - padding} H ${width - padding}`} className="chart-axis" />
      <path d={`M ${padding} ${padding} V ${height - padding}`} className="chart-axis" />
      <path d={path} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
      {points.map((point, index) => {
        const x = padding + index * xStep;
        const y = height - padding - (point.count / max) * (height - padding * 2);
        return (
          <circle key={point.date} cx={x} cy={y} r="4" fill={color}>
            <title>{`${point.date}: ${point.count}`}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function BarChart({
  data,
  onSelect,
}: {
  data: Array<[string, number]>;
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(1, ...data.map(([, value]) => value));
  return (
    <div className="bar-chart" role="img" aria-label="Appointments by document type">
      {data.length ? (
        data.map(([label, value]) => (
          <button
            type="button"
            key={label}
            className="bar-row"
            onClick={() => onSelect?.(label)}
            title={`Open appointments for ${label}`}
          >
            <span className="bar-label">{label}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
            </span>
            <span className="bar-value">{value}</span>
          </button>
        ))
      ) : (
        <div className="analytics-empty">No document data in this range.</div>
      )}
    </div>
  );
}

function DonutChart({ data }: { data: Array<[string, number]> }) {
  const total = data.reduce((sum, [, value]) => sum + value, 0);
  let running = 0;
  const gradient = total
    ? data
        .map(([label, value]) => {
          const start = (running / total) * 100;
          running += value;
          const end = (running / total) * 100;
          return `${STATUS_COLORS[label] ?? "#64748b"} ${start}% ${end}%`;
        })
        .join(", ")
    : "#e5e7eb 0% 100%";

  return (
    <div className="donut-wrap">
      <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
        <div>
          <strong>{total}</strong>
          <span>Total</span>
        </div>
      </div>
      <div className="chart-legend">
        {data.map(([label, value]) => (
          <div key={label} className="legend-item">
            <span style={{ background: STATUS_COLORS[label] ?? "#64748b" }} />
            {label}: {value}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  trend,
  href,
  tone = "neutral",
}: {
  title: string;
  value: string | number;
  trend?: number;
  href?: string;
  tone?: "neutral" | "pending" | "confirmed" | "completed" | "cancelled";
}) {
  const content = (
    <>
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      {trend != null ? (
        <div className={`stat-trend ${trend >= 0 ? "positive" : "negative"}`}>
          {trend >= 0 ? "Up" : "Down"} {Math.abs(trend)}% vs previous period
        </div>
      ) : null}
      <div className="sparkline" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    </>
  );

  if (href) {
    return (
      <Link className={`stat-card analytics-stat ${tone}`} href={href}>
        {content}
      </Link>
    );
  }
  return <div className={`stat-card analytics-stat ${tone}`}>{content}</div>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      const token = getAdminToken();
      if (!token) {
        router.push("/admin/login");
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [nextAnalytics, nextHealth] = await Promise.all([
          apiJson<Analytics>(`/admin/analytics?days=${days}`, {
            headers: authHeaders(token),
          }),
          apiJson<Health>("/health"),
        ]);
        setAnalytics(nextAnalytics);
        setHealth(nextHealth);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [days, router],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const id = window.setInterval(() => void loadDashboard(true), 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loadDashboard]);

  const statusEntries = useMemo(
    () => sortedEntries(analytics?.status_counts ?? {}),
    [analytics],
  );
  const documentEntries = useMemo(
    () => sortedEntries(analytics?.document_counts ?? {}),
    [analytics],
  );
  const locationEntries = useMemo(
    () => sortedEntries(analytics?.location_counts ?? {}).slice(0, 6),
    [analytics],
  );

  function exportCsv() {
    if (!analytics) return;
    const rows = [
      ["Metric", "Value"],
      ["Range", `${analytics.range.start} to ${analytics.range.end}`],
      ["Appointments", String(analytics.totals.appointments)],
      ["New Users", String(analytics.totals.new_users)],
      ["Active Users", String(analytics.totals.active_users)],
      ["Booking Rate", `${analytics.kpis.booking_rate}%`],
      ["Completion Rate", `${analytics.kpis.completion_rate}%`],
      ["Cancellation Rate", `${analytics.kpis.cancellation_rate}%`],
      ...documentEntries.map(([label, value]) => [`Document: ${label}`, String(value)]),
      ...statusEntries.map(([label, value]) => [`Status: ${label}`, String(value)]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `prime-dashboard-${analytics.range.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="admin-container analytics-dashboard">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Loading analytics...</p>
        </div>
        <div className="analytics-skeleton-grid">
          <div className="analytics-skeleton" />
          <div className="analytics-skeleton" />
          <div className="analytics-skeleton" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="admin-container">
        <div className="alert error">{error ?? "No analytics available"}</div>
      </div>
    );
  }

  const appointmentTrend = pctChange(
    analytics.totals.appointments,
    analytics.totals.previous_appointments,
  );
  const userTrend = pctChange(analytics.totals.new_users, analytics.totals.previous_users);

  return (
    <div className="admin-container analytics-dashboard">
      <div className="analytics-topbar">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>
            Analytics from {analytics.range.start} to {analytics.range.end}
          </p>
        </div>
        <div className="analytics-actions">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Date range"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.days} value={option.days}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadDashboard(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="analytics-tabs" role="tablist">
        {(["overview", "appointments", "users", "performance"] as DashboardTab[]).map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <>
          <div className="admin-stats analytics-stats">
            <StatCard
              title="Appointments"
              value={analytics.totals.appointments}
              trend={appointmentTrend}
              href="/admin/appointments"
            />
            <StatCard title="New Users" value={analytics.totals.new_users} trend={userTrend} href="/admin/users" />
            <StatCard
              title="Pending"
              value={analytics.status_counts.pending ?? 0}
              href="/admin/appointments?status=pending"
              tone="pending"
            />
            <StatCard
              title="Completed"
              value={analytics.status_counts.completed ?? 0}
              href="/admin/appointments?status=completed"
              tone="completed"
            />
          </div>

          <div className="analytics-grid">
            <section className="analytics-panel analytics-panel-wide">
              <div className="analytics-panel-head">
                <h2>Appointments Over Time</h2>
                <span>Auto-refreshes every 5 minutes</span>
              </div>
              <LineChart points={analytics.appointments_over_time} />
            </section>
            <section className="analytics-panel">
              <div className="analytics-panel-head">
                <h2>Status Distribution</h2>
              </div>
              <DonutChart data={statusEntries} />
            </section>
            <section className="analytics-panel">
              <div className="analytics-panel-head">
                <h2>Top Insights</h2>
              </div>
              <div className="insight-list">
                <div>
                  <strong>{analytics.insights.most_booked_document.label}</strong>
                  <span>Most booked document ({analytics.insights.most_booked_document.count})</span>
                </div>
                <div>
                  <strong>{analytics.insights.busiest_day.label}</strong>
                  <span>Busiest day ({analytics.insights.busiest_day.count})</span>
                </div>
                <div>
                  <strong>{analytics.insights.busiest_location.label}</strong>
                  <span>Busiest location ({analytics.insights.busiest_location.count})</span>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : null}

      {tab === "appointments" ? (
        <div className="analytics-grid">
          <section className="analytics-panel analytics-panel-wide">
            <div className="analytics-panel-head">
              <h2>Document Type Performance</h2>
              <span>Click a row to drill down</span>
            </div>
            <BarChart
              data={documentEntries}
              onSelect={(label) => router.push(`/admin/appointments?document=${encodeURIComponent(label)}`)}
            />
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Fulfillment</h2>
            </div>
            <div className="kpi-grid">
              <div>
                <strong>{analytics.kpis.completion_rate}%</strong>
                <span>Completion rate</span>
              </div>
              <div>
                <strong>{analytics.kpis.cancellation_rate}%</strong>
                <span>Cancellation rate</span>
              </div>
              <div>
                <strong>{analytics.kpis.pending_over_three_days}</strong>
                <span>Pending over 3 days</span>
              </div>
            </div>
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Locations</h2>
            </div>
            <BarChart data={locationEntries} />
          </section>
        </div>
      ) : null}

      {tab === "users" ? (
        <div className="analytics-grid">
          <section className="analytics-panel analytics-panel-wide">
            <div className="analytics-panel-head">
              <h2>User Growth</h2>
              <span>{analytics.totals.active_users} active booking users in range</span>
            </div>
            <LineChart points={analytics.users_over_time} color="#16a34a" />
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>User Engagement</h2>
            </div>
            <div className="kpi-grid">
              <div>
                <strong>{analytics.totals.users}</strong>
                <span>Total users</span>
              </div>
              <div>
                <strong>{analytics.totals.new_users}</strong>
                <span>New users</span>
              </div>
              <div>
                <strong>{analytics.kpis.booking_rate}%</strong>
                <span>Booking rate</span>
              </div>
            </div>
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Cohorts</h2>
            </div>
            <p className="analytics-note">
              Signup cohorts need login history or activity events. Current metrics use user creation
              and appointment activity.
            </p>
          </section>
        </div>
      ) : null}

      {tab === "performance" ? (
        <div className="analytics-grid">
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>System Health</h2>
            </div>
            <div className="health-list">
              <span className={health?.ok ? "ok" : "bad"}>API: {health?.ok ? "Online" : "Issue"}</span>
              <span className={health?.database === "ok" ? "ok" : "bad"}>
                Database: {health?.database ?? "Unknown"}
              </span>
              <span className={health?.smtp_configured ? "ok" : "warn"}>
                SMTP: {health?.smtp_configured ? "Configured" : "Not configured"}
              </span>
            </div>
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Data Alerts</h2>
            </div>
            {analytics.alerts.length ? (
              <div className="alert-list">
                {analytics.alerts.map((alert) => (
                  <div key={alert.message} className={`data-alert ${alert.level}`}>
                    {alert.message}
                  </div>
                ))}
              </div>
            ) : (
              <div className="analytics-empty">No anomalies detected.</div>
            )}
          </section>
          <section className="analytics-panel">
            <div className="analytics-panel-head">
              <h2>Reporting</h2>
            </div>
            <p className="analytics-note">
              CSV export is available now. PDF and scheduled email reports need a report renderer and
              SMTP credentials in production.
            </p>
          </section>
        </div>
      ) : null}

      <footer className="dashboard-footer">
        <span>Last updated: {formatDateTime(analytics.last_updated)}</span>
        <span>Refresh rate: 5 minutes</span>
        <span>Data source: PRIME API</span>
        <span>Data issues: contact system administrator</span>
      </footer>
    </div>
  );
}
