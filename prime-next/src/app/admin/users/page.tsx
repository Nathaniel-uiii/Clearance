"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminToken } from "@/lib/auth";
import { apiJson, authHeaders } from "@/lib/api";

interface User {
  id: number;
  email: string;
  username: string;
  gender: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    try {
      const data = await apiJson<User[]>("/admin/users", {
        headers: authHeaders(token),
      });
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdminStatus(userId: number, isAdmin: boolean) {
    const token = getAdminToken();
    if (!token) {
      setMessage({ type: "error", text: "Admin session expired. Please log in again." });
      router.push("/admin/login");
      return;
    }

    const endpoint = isAdmin ? `/admin/users/${userId}/remove-admin` : `/admin/users/${userId}/make-admin`;

    try {
      await apiJson<{ message: string; user: User }>(endpoint, {
        method: "POST",
        headers: authHeaders(token),
      });

      setMessage({ type: "success", text: "User privileges updated" });
      loadUsers();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error" });
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <h1>Users Management</h1>
        </div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Users Management</h1>
        <p>Total users: {filteredUsers.length}</p>
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
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {filteredUsers.length === 0 ? (
        <div className="no-data">No users found</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Gender</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.username}</td>
                  <td>{user.gender || "—"}</td>
                  <td>
                    {user.is_admin ? (
                      <span className="admin-badge">Admin</span>
                    ) : (
                      <span>User</span>
                    )}
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-links">
                      <Link href={`/admin/users/${user.id}`} className="view-btn">
                        View
                      </Link>
                      <button
                        className={user.is_admin ? "delete-btn" : "edit-btn"}
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                      >
                        {user.is_admin ? "Remove Admin" : "Make Admin"}
                      </button>
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
