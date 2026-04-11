"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, clearToken } from "@/lib/auth";
import { getApiUrl } from "@/lib/api";
import "@/app/(auth)/auth.css";
import "./admin.css";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: number; email: string; is_admin: boolean } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
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
          clearToken();
          router.push("/admin/login");
        }
      })
      .catch(() => {
        clearToken();
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
        <div className="admin-nav-brand">
          <Link href="/admin">Admin Panel</Link>
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
          <li className="admin-nav-user">
            <span>{user.email}</span>
            <button
              onClick={() => {
                clearToken();
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
