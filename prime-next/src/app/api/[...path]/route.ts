import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL
  ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
  : "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = "/" + pathSegments.join("/");
  const url = new URL(`${API_BASE}${path}${request.nextUrl.search}`);

  const authHeader = request.headers.get("authorization");
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: "API request failed" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = "/" + pathSegments.join("/");
  const url = new URL(`${API_BASE}${path}${request.nextUrl.search}`);

  const authHeader = request.headers.get("authorization");
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  let body = undefined;
  if (request.method === "POST" && request.body) {
    body = await request.text();
    headers["content-type"] = "application/json";
  }

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: "API request failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = "/" + pathSegments.join("/");
  const url = new URL(`${API_BASE}${path}${request.nextUrl.search}`);

  const authHeader = request.headers.get("authorization");
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  let body = undefined;
  if (request.body) {
    body = await request.text();
    headers["content-type"] = "application/json";
  }

  try {
    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers,
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: "API request failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = "/" + pathSegments.join("/");
  const url = new URL(`${API_BASE}${path}${request.nextUrl.search}`);

  const authHeader = request.headers.get("authorization");
  const headers: Record<string, string> = {};
  if (authHeader) {
    headers["authorization"] = authHeader;
  }

  try {
    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers,
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { detail: "API request failed" },
      { status: 500 }
    );
  }
}
