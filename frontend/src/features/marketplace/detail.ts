import { apiGet } from "@/lib/api/client";
import type { ProductDifficulty, ProductStatus } from "./types";

export interface PackageDetail {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  license_type: "personal" | "single_business" | "commercial" | "extended";
  includes_source_code: boolean;
  includes_documentation: boolean;
  includes_support_days: number;
  includes_updates_days: number;
  is_active: boolean;
  sort_order: number;
}

export interface ProductDetail {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  long_description: string;
  difficulty: ProductDifficulty;
  status: ProductStatus;
  starting_price_cents: number;
  currency: string;
  cover_image_url: string | null;
  demo_video_url: string | null;
  live_demo_url: string | null;
  is_featured: boolean;
  published_at: string | null;
  created_at: string;
  category_id: string | null;
  packages: PackageDetail[];
}

export async function fetchProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    return await apiGet<ProductDetail>(`/marketplace/products/${slug}`);
  } catch {
    return null;
  }
}
