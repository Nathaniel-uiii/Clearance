const API_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
    : "http://localhost:8000";

/** Stops the button spinning forever when the API is down or unreachable */
const REQUEST_TIMEOUT_MS = 20_000;

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function getApiUrl(path: string): string {
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.info("[API] using base URL:", API_BASE);
}

export function authHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

function buildFetchHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? undefined);
  const hasBody =
    init?.body != null &&
    !(typeof init.body === "string" && init.body.length === 0);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

export async function apiJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const headers = buildFetchHeaders(init);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error(
        `No response from API after ${REQUEST_TIMEOUT_MS / 1000}s. Start your Python API (e.g. uvicorn) and confirm NEXT_PUBLIC_API_BASE_URL in .env.local points to it (using ${API_BASE}).`,
      );
    }
    if (e instanceof TypeError) {
      throw new Error(
        `Cannot reach API at ${API_BASE}. Check the server is running, the URL, and CORS allows this site.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as {
        detail?: string | Array<{ msg?: string } | string>;
      };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((d) => {
            const m = typeof d === "string" ? d : (d.msg ?? "");
            return m.replace(/^Value error,\s*/i, "").trim();
          })
          .filter(Boolean)
          .join(", ");
      }
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}
