"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function Tr({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
