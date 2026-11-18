"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { API_BASE } from "@/lib/api/client";

const SOURCE_LANG = "en";
const STORAGE_KEY = "ibrant_lang";
const BATCH_DELAY_MS = 15;
const MAX_BATCH = 200;

export type Messages = Record<string, any>;

type I18nContextValue = {
  lang: string;
  locale: string;
  setLang: (lang: string) => void;
  setLocale: (lang: string) => void;
  t: (textOrKey: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const keyOf = (lang: string, text: string) => `${lang}\u0000${text}`;

export function I18nProvider({ children, messages = {} }: { children: ReactNode; messages?: Messages }) {
  const [lang, setLangState] = useState(SOURCE_LANG);
  const [cache, setCache] = useState<Record<string, string>>({});
  const langRef = useRef(lang);
  const pendingRef = useRef<Set<string>>(new Set());
  const requestedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    langRef.current = lang;
  }, [lang]);

  const flush = useCallback(async () => {
    timerRef.current = null;
    const targetLang = langRef.current;
    const texts = Array.from(pendingRef.current);
    pendingRef.current.clear();
    if (targetLang === SOURCE_LANG || texts.length === 0) return;

    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const chunk = texts.slice(i, i + MAX_BATCH);
      try {
        const res = await fetch(`${API_BASE}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: chunk, target: targetLang }),
        });
        if (!res.ok) throw new Error(`Translate failed: ${res.status}`);
        const { translations } = (await res.json()) as { translations: string[] };

        if (langRef.current !== targetLang) {
          chunk.forEach((text) => requestedRef.current.delete(keyOf(targetLang, text)));
          continue;
        }

        setCache((prev) => {
          const next = { ...prev };
          chunk.forEach((text, idx) => { next[keyOf(targetLang, text)] = translations[idx]; });
          return next;
        });
      } catch (err) {
        chunk.forEach((text) => requestedRef.current.delete(keyOf(targetLang, text)));
        console.error(err);
      }
    }
  }, []);

  const enqueue = useCallback((text: string) => {
    const key = keyOf(langRef.current, text);
    if (requestedRef.current.has(key)) return;
    requestedRef.current.add(key);
    pendingRef.current.add(text);
    if (!timerRef.current) timerRef.current = setTimeout(flush, BATCH_DELAY_MS);
  }, [flush]);

  const t = useCallback((textOrKey: string) => {
    const source = messages[textOrKey] ?? textOrKey;
    if (!source || lang === SOURCE_LANG) return source;
    const hit = cache[keyOf(lang, source)];
    if (hit !== undefined) return hit;
    enqueue(source);
    return source;
  }, [lang, cache, enqueue, messages]);

  const setLang = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEY, next);
    pendingRef.current.clear();
    setLangState(next);
  }, []);

  const value = useMemo(() => ({ lang, locale: lang, setLang, setLocale: setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
