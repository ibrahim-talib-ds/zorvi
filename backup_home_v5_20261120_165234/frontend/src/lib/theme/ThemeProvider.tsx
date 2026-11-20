"use client";
import {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  // Light mode is scoped to the home page: inner pages use hardcoded dark
  // colors, so they stay dark even when "Light" is selected. The choice is
  // remembered and re-applied as soon as the user returns home.
  const onHome = pathname === "/";

  // Read the stored preference synchronously on the client's first render so
  // the first effect already applies the right theme (no post-hydration flip).
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" || stored === "system"
      ? stored
      : "dark";
  });
  const [resolved, setResolved] = useState<Resolved>("dark");

  // Apply the effective theme whenever the preference or the route changes.
  useEffect(() => {
    const r: Resolved = onHome ? resolveTheme(theme) : "dark";
    setResolved(r);
    applyThemeClass(r);
  }, [theme, onHome]);

  // Follow OS changes while in system mode on the home page.
  useEffect(() => {
    if (theme !== "system" || !onHome) return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => {
      const r: Resolved = mq.matches ? "light" : "dark";
      setResolved(r);
      applyThemeClass(r);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, onHome]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore quota / privacy errors */
    }
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
