"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/i18n/en.json";
import sw from "@/i18n/sw.json";
import ru from "@/i18n/ru.json";

const SOURCE_LANG = "en";
const STORAGE_KEY = "ibrant_lang";

const dictionaries: Record<string, any> = { en, sw, ru };

type I18nContextValue = {
  lang: string;
  locale: string;
  setLang: (lang: string) => void;
  setLocale: (lang: string) => void;
  t: (textOrKey: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(SOURCE_LANG);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && dictionaries[saved]) {
      setLangState(saved);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLangState(next);
  }, []);

  const t = useCallback((textOrKey: string) => {
    // 1. Get the dictionary for the current language
    const dict = dictionaries[lang] || dictionaries[SOURCE_LANG];
    
    // 2. Split the key by dots (e.g., "nav.dashboard" -> ["nav", "dashboard"])
    const keys = textOrKey.split(".");
    let value = dict;
    
    // 3. Walk down the dictionary to find the word
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }
    
    // 4. Return the translated word, or fallback to the original key
    return typeof value === "string" ? value : textOrKey;
  }, [lang]);

  const value = useMemo(() => ({ 
    lang, 
    locale: lang, 
    setLang, 
    setLocale: setLang, 
    t 
  }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
