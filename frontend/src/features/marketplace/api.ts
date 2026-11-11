import { API_BASE } from "@/lib/api/client";

export interface MarketplaceProduct {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  difficulty: string;
  status: string;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  is_featured: boolean;
  is_free?: boolean;
  published_at: string | null;
  created_at: string;
  creator_name: string | null;
  creator_avatar_url: string | null;
  live_demo_url?: string | null;
  external_download_url?: string | null;
}

export async function fetchFeaturedProducts(limit = 100): Promise<MarketplaceProduct[]> {
  try {
    const res = await fetch(`${API_BASE}/marketplace/products?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
