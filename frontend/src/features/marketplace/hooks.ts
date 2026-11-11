"use client";

import { useMemo } from "react";
import type { ProductListItem, ProductDifficulty } from "./types";

export type SortOption = "newest" | "price-asc" | "price-desc";

export interface FilterState {
  q: string;
  difficulty: ProductDifficulty | "all";
  sort: SortOption;
}

export function filterProducts(
  products: ProductListItem[],
  filters: FilterState,
): ProductListItem[] {
  let result = [...products];

  // Search filter — case insensitive, matches title or description
  if (filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.short_description.toLowerCase().includes(q),
    );
  }

  // Difficulty filter
  if (filters.difficulty !== "all") {
    result = result.filter((p) => p.difficulty === filters.difficulty);
  }

  // Sort
  switch (filters.sort) {
    case "price-asc":
      result.sort((a, b) => a.starting_price_cents - b.starting_price_cents);
      break;
    case "price-desc":
      result.sort((a, b) => b.starting_price_cents - a.starting_price_cents);
      break;
    case "newest":
    default:
      result.sort((a, b) => {
        const aDate = a.published_at ?? a.created_at;
        const bDate = b.published_at ?? b.created_at;
        return new Date(bDate).getTime() - new Date(aDate).getTime();
      });
  }

  return result;
}

export function useFilteredProducts(
  products: ProductListItem[],
  filters: FilterState,
): ProductListItem[] {
  return useMemo(() => filterProducts(products, filters), [products, filters]);
}
