import type { NextApiRequest, NextApiResponse } from "next";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
  : "http://localhost:8000";

function buildHeaders(req: NextApiRequest): Record<string, string> {
  const headers: Record<string, string> = {};
  if (req.headers.authorization) {
    headers.authorization = req.headers.authorization as string;
  }
  if (req.method !== "GET" && req.method !== "DELETE") {
    headers["content-type"] = "application/json";
  }
  return headers;
}

function getPath(req: NextApiRequest): string {
  const path = req.query.path;
  if (Array.isArray(path)) {
    return `/${path.join("/")}`;
  }
  return `/${path ?? ""}`;
}

function getSearch(req: NextApiRequest): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value != null) {
      query.append(key, value as string);
    }
  }
  const search = query.toString();
  return search ? `?${search}` : "";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = getPath(req);
  const search = getSearch(req);
  const url = `${API_BASE}${path}${search}`;
  const headers = buildHeaders(req);

  let body: string | undefined;
  if (req.method && req.method !== "GET" && req.method !== "DELETE") {
    body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers,
      body,
    });

    const data = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    res.status(response.status);
    res.setHeader("content-type", contentType);
    return res.send(data);
  } catch (error) {
    return res.status(500).json({ detail: "API request failed" });
  }
}
