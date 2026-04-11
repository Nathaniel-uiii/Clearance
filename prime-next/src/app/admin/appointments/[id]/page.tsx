"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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

interface User {
  id: number;
  email: string;
  username: string;
}

const STATUS_OPTIONS = ["pending", "confirmed", "completed", "cancelled"];

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl(`/admin/appointments/${appointmentId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch appointment");
        return res.json();
      })
      .then((data) => {
        setAppointment(data);
        // Fetch user info
        return fetch(getApiUrl(`/admin/users/${data.user_id}`), {
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => res.json());
      })
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [appointmentId, router]);

  async function updateStatus(newStatus: string) {
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

      const updated = await res.json();
      setAppointment(updated);
      setMessage({ type: "success", text: "Appointment updated successfully" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error" });
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Appointment Details</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="admin-container">
        <div className="alert error">{error || "Appointment not found"}</div>
        <Link href="/admin/appointments">Back to Appointments</Link>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/appointments">← Back to Appointments</Link>
      </div>

      <div className="admin-header">
        <h1>Appointment #{appointment.id}</h1>
        <p>{appointment.name}</p>
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

      <div style={{ marginBottom: 30 }}>
        <h2>Appointment Information</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold", width: "30%" }}>Name</td>
              <td style={{ padding: 10 }}>{appointment.name}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Age</td>
              <td style={{ padding: 10 }}>{appointment.age}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Address</td>
              <td style={{ padding: 10 }}>{appointment.address}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Location</td>
              <td style={{ padding: 10 }}>{appointment.location}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Date</td>
              <td style={{ padding: 10 }}>
                {appointment.month} {appointment.day}
              </td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Status</td>
              <td style={{ padding: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className={`status-badge ${appointment.status}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                  <select
                    value={appointment.status}
                    onChange={(e) => updateStatus(e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 4,
                      border: "1px solid #ddd",
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
            <tr>
              <td style={{ padding: 10, fontWeight: "bold" }}>Created</td>
              <td style={{ padding: 10 }}>
                {new Date(appointment.created_at).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {user && (
        <div>
          <h2>User Information</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 10, fontWeight: "bold", width: "30%" }}>Email</td>
                <td style={{ padding: 10 }}>{user.email}</td>
              </tr>
              <tr style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 10, fontWeight: "bold" }}>Name</td>
                <td style={{ padding: 10 }}>{user.username}</td>
              </tr>
              <tr>
                <td style={{ padding: 10, fontWeight: "bold" }}>Action</td>
                <td style={{ padding: 10 }}>
                  <Link href={`/admin/users/${user.id}`} className="view-btn">
                    View User Profile
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
