"use client";
import {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "zorvi-theme";

function resolveTheme(t: Theme): Resolved {
  if (t === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return t;
}

function applyThemeClass(r: Resolved) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(r);
  root.style.colorScheme = r;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<Resolved>("dark");

  // Read stored preference once on mount (blocker script already set the
  // class before paint, so there is no flash).
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "dark";
    setThemeState(initial);
    const r = resolveTheme(initial);
    setResolved(r);
    applyThemeClass(r);
  }, []);

  // Follow OS changes while in system mode.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const r: Resolved = mq.matches ? "light" : "dark";
      setResolved(r);
      applyThemeClass(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore quota / privacy errors */
    }
    const r = resolveTheme(t);
    setResolved(r);
    applyThemeClass(r);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within <ThemeProvider>");
  }
  return ctx;
}
