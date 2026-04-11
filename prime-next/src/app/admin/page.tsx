"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface Stats {
  total_users: number;
  total_appointments: number;
  pending_appointments: number;
  confirmed_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
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
      </div>

      <div className="admin-header">
        <h2>Quick Actions</h2>
      </div>

      <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
        <a href="/admin/users" className="submit" style={{ textDecoration: "none" }}>
          Manage Users
        </a>
        <a href="/admin/appointments" className="submit" style={{ textDecoration: "none" }}>
          Manage Appointments
        </a>
        <a href="/admin/messages" className="submit" style={{ textDecoration: "none" }}>
          Manage Messages
        </a>
      </div>
    </div>
  );
}
