"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";

interface User {
  id: number;
  email: string;
  username: string;
  gender: string | null;
  is_admin: boolean;
  created_at: string;
}

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

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    Promise.all([
      fetch(getApiUrl(`/admin/users/${userId}`), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user");
        return res.json();
      }),
      fetch(getApiUrl(`/admin/users/${userId}/appointments`), {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch appointments");
        return res.json();
      }),
    ])
      .then(([userData, appointmentsData]) => {
        setUser(userData);
        setAppointments(appointmentsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId, router]);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>User Details</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="admin-container">
        <div className="alert error">{error || "User not found"}</div>
        <Link href="/admin/users">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/users">← Back to Users</Link>
      </div>

      <div className="admin-header">
        <h1>{user.username}</h1>
        <p>{user.email}</p>
      </div>

      <div style={{ marginBottom: 30 }}>
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
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Gender</td>
              <td style={{ padding: 10 }}>{user.gender || "Not specified"}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 10, fontWeight: "bold" }}>Role</td>
              <td style={{ padding: 10 }}>
                {user.is_admin ? (
                  <span className="admin-badge">Admin</span>
                ) : (
                  <span>Regular User</span>
                )}
              </td>
            </tr>
            <tr>
              <td style={{ padding: 10, fontWeight: "bold" }}>Joined</td>
              <td style={{ padding: 10 }}>
                {new Date(user.created_at).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2>Appointments ({appointments.length})</h2>
        {appointments.length === 0 ? (
          <div className="no-data">No appointments</div>
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
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
