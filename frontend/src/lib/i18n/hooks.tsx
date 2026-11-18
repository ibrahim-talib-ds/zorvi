"use client";
import { useMemo } from "react";
import { useI18n } from "./I18nProvider";

export function useT() { return useI18n().t; }
export function T({ children }: { children: string }) {
  const { t } = useI18n();
  return <>{t(children)}</>;
}
export function useTranslatedList<T extends object>(items: T[], fields: ReadonlyArray<keyof T & string>): T[] {
  const { t } = useI18n();
  return useMemo(() => items.map((item) => {
    const copy = { ...item };
    for (const field of fields) {
      const value = item[field];
      if (typeof value === "string") (copy as Record<string, unknown>)[field] = t(value);
    }
    return copy;
  }), [items, fields, t]);
}
