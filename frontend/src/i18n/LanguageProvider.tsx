"use client";

import { createContext, useContext, useState, useEffect } from "react";
import en from "@/i18n/en.json";
import sw from "@/i18n/sw.json";
import ru from "@/i18n/ru.json";

const dictionaries: Record<string, any> = { en, sw, ru };

const LanguageContext = createContext<{
  locale: string;
  setLocale: (lang: string) => void;
  t: (key: string) => string;
}>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState("en");

  useEffect(() => {
    const saved = localStorage.getItem("ibrant_lang");
    if (saved && dictionaries[saved]) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (lang: string) => {
    setLocaleState(lang);
    localStorage.setItem("ibrant_lang", lang);
  };

  const t = (key: string) => {
    const keys = key.split(".");
    let value = dictionaries[locale];
    for (const k of keys) {
      value = value?.[k];
    }
    return value || key; // Fallback to key if translation missing
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
