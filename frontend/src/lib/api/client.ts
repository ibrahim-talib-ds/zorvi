/**
 * ibrant API client. Production API addresses are supplied by deployment
 * configuration; no private hosting hostname is embedded in the source.
 */

const isServer = typeof window === "undefined";
const isProduction = process.env.NODE_ENV === "production";
const trimBase = (value?: string) => value?.trim().replace(/\/+$/, "") || "";

const publicApiBase = trimBase(process.env.NEXT_PUBLIC_API_BASE);
// Optional server-only address for private container/service networking.
const internalApiBase = trimBase(process.env.API_INTERNAL_BASE);

const localServerBase = "http://127.0.0.1:8001/api/v1";
const localClientBase = "http://localhost:8001/api/v1";
const productionServerBase = "http://127.0.0.1:8000/api/v1";
const productionClientBase = "/api/v1";

const serverBase = internalApiBase || publicApiBase || (isProduction ? productionServerBase : localServerBase);
const clientBase = publicApiBase || (isProduction ? productionClientBase : localClientBase);

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
