"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAdminToken, clearAdminToken } from "@/lib/auth";
import { getApiUrl, apiJson, authHeaders } from "@/lib/api";
import "@/app/(auth)/auth.css";
import "./admin.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; email: string; is_admin: boolean; profile_picture?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPictureInput, setShowPictureInput] = useState(false);
  const [tempPictureUrl, setTempPictureUrl] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin/login");
      return;
    }

    // Fetch current user to verify admin status
    fetch(getApiUrl("/me"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch user info");
        return res.json();
      })
      .then((data) => {
        if (data.is_admin) {
          setUser(data);
          setLoading(false);
        } else {
          clearAdminToken();
          router.push("/admin/login");
        }
      })
      .catch(() => {
        clearAdminToken();
        router.push("/admin/login");
      });
  }, [router]);

  if (loading) {
    return <div className="admin-container">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="admin-layout">
      <nav className="admin-navbar">
        <div className="admin-profile">
          <div className="admin-avatar-container">
            <img 
              src={user.profile_picture || "/images/ken.jpg"} 
              alt="Admin profile" 
              className="admin-avatar" 
              onClick={() => {
                setShowPictureInput(!showPictureInput);
                setTempPictureUrl(user.profile_picture || "");
              }}
              style={{ cursor: 'pointer' }}
            />
            {showPictureInput && (
              <div 
                className="picture-input-overlay"
                onClick={() => setShowPictureInput(false)}
              >
                <input
                  type="text"
                  placeholder="Enter picture URL"
                  value={tempPictureUrl}
                  onChange={(e) => setTempPictureUrl(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className="picture-input-buttons" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={async () => {
                      const token = getAdminToken();
                      if (!token) return;
                      try {
                        await apiJson("/me", {
                          method: "PATCH",
                          headers: authHeaders(token),
                          body: JSON.stringify({ profile_picture: tempPictureUrl }),
                        });
                        setUser({ ...user, profile_picture: tempPictureUrl });
                        setShowPictureInput(false);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowPictureInput(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="admin-profile-info">
            <span className="admin-profile-name">Admin</span>
            <span className="admin-profile-email">{user.email}</span>
          </div>
        </div>

        <ul className="admin-nav-links">
          <li>
            <Link href="/admin">Dashboard</Link>
          </li>
          <li>
            <Link href="/admin/users">Users</Link>
          </li>
          <li>
            <Link href="/admin/appointments">Appointments</Link>
          </li>
          <li>
            <Link href="/admin/messages">Messages</Link>
          </li>
          <li className="admin-nav-logout">
            <button
              onClick={() => {
                clearAdminToken();
                router.push("/login");
              }}
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>

      <main className="admin-main">{children}</main>
    </div>
  );
}
