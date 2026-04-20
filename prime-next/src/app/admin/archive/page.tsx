"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";
import { apiJson, authHeaders, getApiUrl } from "@/lib/api";
import "../admin.css";

interface ArchivedMessage {
  id: number;
  original_message_id: number;
  fullname: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  archived_at: string;
}

export default function AdminArchivePage() {
  const router = useRouter();
  const [archivedMessages, setArchivedMessages] = useState<ArchivedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; archiveId: number | null }>({
    open: false,
    archiveId: null,
  });

  useEffect(() => {
    loadArchivedMessages();
  }, []);

  async function loadArchivedMessages() {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const data = await apiJson<ArchivedMessage[]>("/admin/archived-messages", {
        headers: authHeaders(token),
      });
      setArchivedMessages(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch archived messages");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDelete() {
    const token = getAdminToken();
    if (!token || deleteModal.archiveId === null) {
      setError("Admin session expired. Please log in again.");
      router.push("/admin/login");
      return;
    }

    try {
      await apiJson(`/admin/archived-messages/${deleteModal.archiveId}`, {
        method: "DELETE",
        headers: authHeaders(token),
      });

      setDeleteModal({ open: false, archiveId: null });
      loadArchivedMessages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function cleanupOldMessages() {
    const token = getAdminToken();
    if (!token) {
      setError("Admin session expired. Please log in again.");
      router.push("/admin/login");
      return;
    }

    try {
      const result = await apiJson<{ message: string }>("/admin/archived-messages/cleanup", {
        method: "POST",
        headers: authHeaders(token),
      });
      alert(result.message);
      loadArchivedMessages();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Archived Messages</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Archived Messages</h1>
        <p>Total archived messages: {archivedMessages.length}</p>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div style={{ marginBottom: "16px" }}>
        <button
          onClick={cleanupOldMessages}
          style={{
            padding: "10px 20px",
            background: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Cleanup Messages Older Than 30 Days
        </button>
      </div>

      {archivedMessages.length === 0 ? (
        <div className="no-data">No archived messages found</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Subject</th>
                <th>Email</th>
                <th>Status</th>
                <th>Archived Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {archivedMessages.map((msg) => (
                <tr key={msg.id}>
                  <td>{msg.fullname}</td>
                  <td>{msg.subject}</td>
                  <td>{msg.email}</td>
                  <td>
                    <span className={`status-badge ${msg.status}`}>
                      {msg.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{new Date(msg.archived_at).toLocaleString()}</td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => setDeleteModal({ open: true, archiveId: msg.id })}
                    >
                      Delete Permanently
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
            <h3 style={{ marginBottom: "16px" }}>Delete Permanently</h3>
            <p style={{ marginBottom: "24px", color: "#666" }}>Are you sure you want to permanently delete this archived message? This action cannot be undone.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDeleteModal({ open: false, archiveId: null })}
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
