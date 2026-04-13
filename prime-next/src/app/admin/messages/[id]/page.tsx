"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import "@/app/(auth)/auth.css";
import "../../admin.css";

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

export default function AdminMessageDetailPage() {
  const params = useParams();
  const messageId = params?.id;
  const router = useRouter();
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!messageId) return;

    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl(`/admin/messages/${messageId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load message");
        return res.json();
      })
      .then((data) => {
        setMessage(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [messageId, router]);

  async function updateStatus(newStatus: string) {
    if (!messageId) return;
    const token = getAdminToken();
    if (!token) return;

    setActionBusy(true);
    setError(null);

    try {
      const res = await fetch(getApiUrl(`/admin/messages/${messageId}`), {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || "Failed to update message status");
      }
      const updated = await res.json();
      setMessage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Message Details</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-container">
        <div className="alert error">{error}</div>
        <Link href="/admin/messages" className="view-btn">
          Back to Messages
        </Link>
      </div>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <div className="admin-container">
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/messages">← Back to Messages</Link>
      </div>

      <div className="admin-header">
        <h1>Message Details</h1>
      </div>

      {error ? (
        <div className="alert error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      ) : null}

      {/* Sender Info Card */}
      <div style={{
        backgroundColor: "#f8f9fa",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "24px",
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: "18px" }}>From</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px",
        }}>
          <div>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#333" }}>Name</label>
            <p style={{ margin: 0, color: "#666" }}>{message.fullname}</p>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#333" }}>Email</label>
            <p style={{ margin: 0, color: "#0066cc" }}>
              <a href={`mailto:${message.email}`} style={{ color: "#0066cc", textDecoration: "none" }}>
                {message.email}
              </a>
            </p>
          </div>
          <div>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "4px", color: "#333" }}>Phone</label>
            <p style={{ margin: 0, color: "#666" }}>
              {message.phone ? (
                <a href={`tel:${message.phone}`} style={{ color: "#0066cc", textDecoration: "none" }}>
                  {message.phone}
                </a>
              ) : (
                "Not provided"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Message Metadata */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px",
        marginBottom: "24px",
      }}>
        <div style={{
          backgroundColor: "#f0f7ff",
          border: "1px solid #b3d9ff",
          borderRadius: "6px",
          padding: "12px 16px",
        }}>
          <label style={{ display: "block", fontWeight: "600", fontSize: "12px", color: "#0052cc", textTransform: "uppercase", marginBottom: "6px" }}>Subject</label>
          <p style={{ margin: 0, fontSize: "16px", fontWeight: "500" }}>{message.subject}</p>
        </div>
        <div style={{
          backgroundColor: message.status === "new" ? "#fff3cd" : message.status === "read" ? "#e2f0f9" : "#d4edda",
          border: message.status === "new" ? "1px solid #ffc107" : message.status === "read" ? "1px solid #17a2b8" : "1px solid #28a745",
          borderRadius: "6px",
          padding: "12px 16px",
        }}>
          <label style={{ display: "block", fontWeight: "600", fontSize: "12px", color: "#333", textTransform: "uppercase", marginBottom: "6px" }}>Status</label>
          <p style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: "500",
            color: message.status === "new" ? "#856404" : message.status === "read" ? "#004085" : "#155724",
            textTransform: "capitalize",
          }}>
            {message.status}
          </p>
        </div>
        <div style={{
          backgroundColor: "#f8f9fa",
          border: "1px solid #e0e0e0",
          borderRadius: "6px",
          padding: "12px 16px",
        }}>
          <label style={{ display: "block", fontWeight: "600", fontSize: "12px", color: "#666", textTransform: "uppercase", marginBottom: "6px" }}>Received</label>
          <p style={{ margin: 0, fontSize: "14px" }}>{new Date(message.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Message Content */}
      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "20px",
        marginBottom: "24px",
      }}>
        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: "18px" }}>Message</h2>
        <p style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          lineHeight: "1.6",
          color: "#333",
          backgroundColor: "#f8f9fa",
          padding: "12px",
          borderRadius: "4px",
          borderLeft: "4px solid #0066cc",
        }}>
          {message.message}
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          className="submit"
          disabled={actionBusy || message.status === "read"}
          onClick={() => updateStatus("read")}
          style={{
            padding: "10px 20px",
            backgroundColor: message.status === "read" ? "#ccc" : "#0066cc",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: actionBusy || message.status === "read" ? "not-allowed" : "pointer",
            fontWeight: "500",
          }}
        >
          {actionBusy ? "Processing..." : "Mark Read"}
        </button>
        <button
          className="edit-btn"
          disabled={actionBusy || message.status === "resolved"}
          onClick={() => updateStatus("resolved")}
          style={{
            padding: "10px 20px",
            backgroundColor: message.status === "resolved" ? "#ccc" : "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: actionBusy || message.status === "resolved" ? "not-allowed" : "pointer",
            fontWeight: "500",
          }}
        >
          {actionBusy ? "Processing..." : "Mark Resolved"}
        </button>
        <button
          className="delete-btn"
          disabled={actionBusy}
          onClick={async () => {
            if (!messageId) return;
            if (!confirm("Delete this message?")) return;
            const token = getAdminToken();
            if (!token) return;
            setActionBusy(true);
            try {
              const res = await fetch(getApiUrl(`/admin/messages/${messageId}`), {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (!res.ok) {
                const body = await res.json();
                throw new Error(body.detail || "Failed to delete message");
              }
              router.push("/admin/messages");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Error");
            } finally {
              setActionBusy(false);
            }
          }}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: actionBusy ? "not-allowed" : "pointer",
            fontWeight: "500",
          }}
        >
          {actionBusy ? "Processing..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
