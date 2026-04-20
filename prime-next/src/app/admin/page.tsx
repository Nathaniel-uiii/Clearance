"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface Stats {
  total_users: number;
  total_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  new_users_today: number;
  appointments_today: number;
  appointments_last_7_days: number;
  appointments_by_document_type: Record<string, number>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl("/admin/stats"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="alert error">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
        </div>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>System overview and statistics</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <h3>Total Users</h3>
          <div className="stat-value">{stats.total_users}</div>
        </div>

        <div className="stat-card">
          <h3>Total Appointments</h3>
          <div className="stat-value">{stats.total_appointments}</div>
        </div>

        <div className="stat-card pending">
          <h3>Pending Appointments</h3>
          <div className="stat-value">{stats.pending_appointments}</div>
        </div>

        <div className="stat-card confirmed">
          <h3>Confirmed Appointments</h3>
          <div className="stat-value">{stats.confirmed_appointments}</div>
        </div>

        <div className="stat-card completed">
          <h3>Completed Appointments</h3>
          <div className="stat-value">{stats.completed_appointments}</div>
        </div>

        <div className="stat-card cancelled">
          <h3>Cancelled Appointments</h3>
          <div className="stat-value">{stats.cancelled_appointments}</div>
        </div>

        <div className="stat-card">
          <h3>New Users Today</h3>
          <div className="stat-value">{stats.new_users_today}</div>
        </div>

        <div className="stat-card">
          <h3>Appointments Today</h3>
          <div className="stat-value">{stats.appointments_today}</div>
        </div>

        <div className="stat-card">
          <h3>Appointments Last 7 Days</h3>
          <div className="stat-value">{stats.appointments_last_7_days}</div>
        </div>
      </div>

      <div className="admin-header">
        <h2>Appointment Breakdown</h2>
      </div>
      <div className="admin-breakdown">
        {Object.entries(stats.appointments_by_document_type).map(([type, count]) => (
          <div key={type} className="stat-card breakdown-card">
            <h3>{type}</h3>
            <div className="stat-value">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
