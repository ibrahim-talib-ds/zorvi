/**
 * ZORVI — API client
 */

// On the SERVER (SSR): use internal Docker network URL (fast, direct)
// In the BROWSER: use public URL (goes through Coolify proxy)
const isServer = typeof window === "undefined";

export const API_BASE = isServer
  ? "http://lkgf3nkt0ugn23cvidfqhnci-20261112T062545:8000/api/v1"
  : "http://lkgf3nkt0ugn23cvidfqhnci.172.21.0.1.sslip.io/api/v1";

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
