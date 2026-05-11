"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; messageId: number | null }>({
    open: false,
    messageId: null,
  });

  const loadMessages = useCallback(() => {
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
  }, [router]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const filteredMessages =
    statusFilter === "all"
      ? messages
      : messages.filter((msg) => msg.status === statusFilter);

  async function confirmDelete() {
    const token = getAdminToken();
    if (!token || deleteModal.messageId === null) {
      setError("Admin session expired. Please log in again.");
      router.push("/admin/login");
      return;
    }

    const res = await fetch(getApiUrl(`/admin/messages/${deleteModal.messageId}`), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.detail || "Failed to delete message");
      return;
    }

    setDeleteModal({ open: false, messageId: null });
    loadMessages();
  }

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
                      onClick={() => setDeleteModal({ open: true, messageId: msg.id })}
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

      {deleteModal.open && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "#fff",
            padding: "24px",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
          }}>
            <h3 style={{ marginBottom: "16px" }}>Delete Message</h3>
            <p style={{ marginBottom: "24px", color: "#666" }}>Are you sure you want to delete this message? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteModal({ open: false, messageId: null })}
                style={{
                  padding: "10px 20px",
                  border: "1px solid #ddd",
                  borderRadius: "6px",
                  background: "#fff",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#dc3545",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
