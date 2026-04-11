"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  function loadUsers() {
    const token = getToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch(getApiUrl("/admin/users"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch users");
        return res.json();
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }

  async function toggleAdminStatus(userId: number, isAdmin: boolean) {
    const token = getToken();
    if (!token) return;

    const endpoint = isAdmin ? getApiUrl(`/admin/users/${userId}/remove-admin`) : getApiUrl(`/admin/users/${userId}/make-admin`);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to update user");
      }

      setMessage({ type: "success", text: "User privileges updated" });
      loadUsers();
    } catch (err) {
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
