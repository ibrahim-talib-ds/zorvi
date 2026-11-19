"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from "react";
import type { Locale } from "@/i18n/config";

type Messages = Record<string, any>;

// Correct path (@/i18n) and all 10 languages included
const loaders: Record<string, () => Promise<{ default: Messages }>> = {
  en: () => import("@/i18n/en.json"),
  sw: () => import("@/i18n/sw.json"),
  ru: () => import("@/i18n/ru.json"),
  fr: () => import("@/i18n/fr.json"),
  ar: () => import("@/i18n/ar.json"),
  es: () => import("@/i18n/es.json"),
  zh: () => import("@/i18n/zh.json"),
  hi: () => import("@/i18n/hi.json"),
  pt: () => import("@/i18n/pt.json"),
  de: () => import("@/i18n/de.json"),
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
  const [messages, setMessages] = useState<Messages>({});
  const [fallback, setFallback] = useState<Messages>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && loaders[saved]) setLangState(saved);
  }, []);

  useEffect(() => {
    loaders.en().then((m) => setFallback(m.default));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = loaders[lang];

    if (load) {
      load().then((m) => {
        if (!cancelled) setMessages(m.default);
      });
    } else {
      setMessages({});
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = RTL_LOCALES.includes(lang) ? "rtl" : "ltr";

    return () => { cancelled = true; };
  }, [lang]);

  const setLang = useCallback((l: string) => {
    if (!loaders[l]) return;
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  const t = useCallback(
    (key: string) => getByPath(messages, key) ?? getByPath(fallback, key) ?? key,
    [messages, fallback]
  );

  const value = useMemo(() => ({ lang, locale: lang, setLang, setLocale: setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
