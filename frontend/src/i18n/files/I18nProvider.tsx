"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "@/config";

type Messages = Record<string, any>;

// Only list locales whose JSON file exists. Others fall back to English.
const loaders: Partial<Record<Locale, () => Promise<{ default: Messages }>>> = {
  en: () => import("@/messages/en.json"),
  sw: () => import("@/messages/sw.json"),
  ru: () => import("@/messages/ru.json"),
};

const RTL_LOCALES: Locale[] = ["ar"];
const STORAGE_KEY = "app-locale";

function isSupported(value: string | null): value is Locale {
  return !!value && value in loaders;
}

function getByPath(obj: Messages, path: string): string | undefined {
  return path.split(".").reduce<any>((o, k) => o?.[k], obj);
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [messages, setMessages] = useState<Messages>({});
  const [fallback, setFallback] = useState<Messages>({});

  // Restore the saved language after mount (avoids hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isSupported(saved)) setLocaleState(saved);
  }, []);

  // Always load English as the fallback.
  useEffect(() => {
    loaders.en?.().then((m) => setFallback(m.default));
  }, []);

  // Load the messages for the current locale and update the document.
  useEffect(() => {
    let cancelled = false;
    const load = loaders[locale];

    if (load) {
      load().then((m) => {
        if (!cancelled) setMessages(m.default);
      });
    } else {
      setMessages({}); // no file yet: English fallback is used
    }

    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

    return () => {
      cancelled = true; // ignore a slow load if the user switched again
    };
  }, [locale]);

  // Save the choice only when the user picks a language.
  const setLocale = useCallback((l: Locale) => {
    if (!isSupported(l)) return;
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string) => getByPath(messages, key) ?? getByPath(fallback, key) ?? key,
    [messages, fallback]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
