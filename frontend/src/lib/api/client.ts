/**
 * ZORVI — API client
 */

// HARDCODED production API URL
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  "http://lkgf3nkt0ugn23cvidfqhnci.172.21.0.1.sslip.io/api/v1";

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
