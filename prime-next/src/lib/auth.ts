const USER_STORAGE_KEY = "prime_user_token";
const ADMIN_STORAGE_KEY = "prime_admin_token";

// User authentication functions
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_STORAGE_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(USER_STORAGE_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

// Admin authentication functions
export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_STORAGE_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(ADMIN_STORAGE_KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
}
