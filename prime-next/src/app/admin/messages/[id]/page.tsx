"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
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

    const token = getToken();
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
    const token = getToken();
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
      <div className="admin-header">
        <h1>Message Details</h1>
      </div>

      <div className="admin-detail-grid">
        <div>
          <strong>Sender</strong>
          <p>{message.fullname}</p>
        </div>
        <div>
          <strong>Email</strong>
          <p>{message.email}</p>
        </div>
        <div>
          <strong>Phone</strong>
          <p>{message.phone || "—"}</p>
        </div>
        <div>
          <strong>Subject</strong>
          <p>{message.subject}</p>
        </div>
        <div>
          <strong>Status</strong>
          <p>{message.status}</p>
        </div>
        <div>
          <strong>Received</strong>
          <p>{new Date(message.created_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="admin-section">
        <h2>Message</h2>
        <p style={{ whiteSpace: "pre-wrap" }}>{message.message}</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          className="submit"
          disabled={actionBusy || message.status === "read"}
          onClick={() => updateStatus("read")}
        >
          Mark Read
        </button>
        <button
          className="edit-btn"
          disabled={actionBusy || message.status === "resolved"}
          onClick={() => updateStatus("resolved")}
        >
          Mark Resolved
        </button>
        <button
          className="delete-btn"
          disabled={actionBusy}
          onClick={async () => {
            if (!messageId) return;
            if (!confirm("Delete this message?")) return;
            const token = getToken();
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
        >
          Delete
        </button>
        <Link href="/admin/messages" className="view-btn">
          Back to Messages
        </Link>
      </div>
    </div>
  );
}
