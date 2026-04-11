"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface Appointment {
  id: number;
  user_id: number;
  name: string;
  age: number;
  address: string;
  day: string;
  month: string;
  location: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

export default function AdminAppointmentsPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadAppointments();
  }, []);

  function loadAppointments() {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl("/admin/appointments"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch appointments");
        return res.json();
      })
      .then((data) => {
        setAppointments(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  async function updateStatus(appointmentId: number, newStatus: string) {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(getApiUrl(`/admin/appointments/${appointmentId}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update appointment");
      }

      setMessage({ type: "success", text: "Appointment updated" });
      loadAppointments();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error" });
    }
  }

  const filteredAppointments =
    statusFilter === "all"
      ? appointments
      : appointments.filter((a) => a.status === statusFilter);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Appointments Management</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Appointments Management</h1>
        <p>Total appointments: {filteredAppointments.length}</p>
      </div>

      {message && (
        <div className={`alert ${message.type}`}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="admin-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="no-data">No appointments found</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Age</th>
                <th>Location</th>
                <th>Date</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAppointments.map((appt) => (
                <tr key={appt.id}>
                  <td>{appt.name}</td>
                  <td>{appt.age}</td>
                  <td>{appt.location}</td>
                  <td>
                    {appt.month} {appt.day}
                  </td>
                  <td>
                    <span className={`status-badge ${appt.status}`}>
                      {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                    </span>
                  </td>
                  <td>{new Date(appt.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Link href={`/admin/appointments/${appt.id}`} className="view-btn">
                        View
                      </Link>
                      <select
                        value={appt.status}
                        onChange={(e) => updateStatus(appt.id, e.target.value)}
                        style={{
                          padding: 6,
                          borderRadius: 4,
                          border: "1px solid #ddd",
                          fontSize: "0.85rem",
                        }}
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
