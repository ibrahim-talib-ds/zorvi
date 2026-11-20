"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import type { Locale } from "@/i18n/config";

import en from "@/i18n/en.json";
import sw from "@/i18n/sw.json";
import fr from "@/i18n/fr.json";
import ar from "@/i18n/ar.json";
import es from "@/i18n/es.json";
import zh from "@/i18n/zh.json";
import hi from "@/i18n/hi.json";
import ru from "@/i18n/ru.json";
import pt from "@/i18n/pt.json";
import de from "@/i18n/de.json";
import tg from "@/i18n/tg.json";

type Messages = Record<string, any>;

// All dictionaries are bundled statically (they are tiny JSON files).
// Switching language is a pure state change - no network, no dynamic import -
// so the UI updates instantly. (The old dynamic import added a delay on the
// first switch to each language.)
const dictionaries: Record<string, Messages> = {
  en, sw, fr, ar, es, zh, hi, ru, pt, de, tg,
};

const RTL_LOCALES: string[] = ["ar"];
const STORAGE_KEY = "ibrant_lang";

function getByPath(obj: Messages, path: string): string | undefined {
  return path.split(".").reduce<any>((o, k) => o?.[k], obj);
}

type I18nContextValue = {
  lang: string;
  locale: string;
  setLang: (lang: string) => void;
  setLocale: (lang: string) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>("en");

  // Restore the saved language after hydration (avoids SSR mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) setLangState(saved);
  }, []);

  // Keep <html lang> and the RTL direction in sync.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LOCALES.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: string) => {
    if (!dictionaries[l]) return;
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const messages = useMemo(() => dictionaries[lang] ?? dictionaries.en, [lang]);

  const t = useCallback(
    (key: string) => getByPath(messages, key) ?? getByPath(dictionaries.en, key) ?? key,
    [messages]
  );

  const value = useMemo(() => ({ lang, locale: lang, setLang, setLocale: setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
