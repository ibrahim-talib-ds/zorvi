/**
 * ZORVI — Marketplace types
 * Match the FastAPI response shapes from /api/v1/marketplace/*.
 */

export type ProductDifficulty = "beginner" | "intermediate" | "advanced" | "expert";
export type ProductStatus = "draft" | "published" | "archived";

export interface ProductListItem {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  difficulty: string;
  status: ProductStatus;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
}

export function formatPrice(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function difficultyLabel(d: ProductDifficulty): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}
