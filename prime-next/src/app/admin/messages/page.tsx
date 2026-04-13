"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import "@/app/(auth)/auth.css";
import "../admin.css";

interface Message {
  id: number;
  fullname: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = ["all", "new", "read", "resolved"];

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadMessages();
  }, []);

  function loadMessages() {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl("/admin/messages"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch messages");
        return res.json();
      })
      .then((data) => {
        setMessages(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  const filteredMessages =
    statusFilter === "all"
      ? messages
      : messages.filter((msg) => msg.status === statusFilter);

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Messages Management</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Messages Management</h1>
        <p>Total messages: {filteredMessages.length}</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div className="admin-filters">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="no-data">No messages found</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Email</th>
                <th>Status</th>
                <th>Received</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredMessages.map((msg) => (
                <tr key={msg.id}>
                  <td>{msg.fullname}</td>
                  <td>{msg.subject}</td>
                  <td>{msg.email}</td>
                  <td>
                    <span className={`status-badge ${msg.status}`}>
                      {msg.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(msg.created_at).toLocaleString()}</td>
                  <td>
                    <Link href={`/admin/messages/${msg.id}`} className="view-btn">
                      View
                    </Link>
                    <button
                      className="delete-btn"
                      style={{ marginLeft: 8 }}
                      onClick={async () => {
                        if (!confirm("Delete this message?")) return;
                        const token = getAdminToken();
                        if (!token) return;
                        const res = await fetch(getApiUrl(`/admin/messages/${msg.id}`), {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!res.ok) {
                          const body = await res.json();
                          setError(body.detail || "Failed to delete message");
                          return;
                        }
                        loadMessages();
                      }}
                    >
                      Delete
                    </button>
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
