/**
 * ZORVI — API client
 */

const isServer = typeof window === "undefined";

// Default to local development URLs
let serverBase = "http://127.0.0.1:8010/api/v1";
let clientBase = "http://127.0.0.1:8010/api/v1";

// If running in Coolify (production), use the hardcoded Docker/Public URLs
if (process.env.NODE_ENV === "production") {
  serverBase = "http://lkgf3nkt0ugn23cvidfqhnci-20261112T062545:8000/api/v1";
  clientBase = "http://lkgf3nkt0ugn23cvidfqhnci.172.21.0.1.sslip.io/api/v1";
}

// Allow override via .env if needed
if (process.env.NEXT_PUBLIC_API_BASE) {
  serverBase = process.env.NEXT_PUBLIC_API_BASE;
  clientBase = process.env.NEXT_PUBLIC_API_BASE;
}

export const API_BASE = isServer ? serverBase : clientBase;

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new ApiError(res.status, body || res.statusText);
  }
  return res.json() as Promise<T>;
}
