"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/design-system/cn";

type Mode = "light" | "dark" | "system";

const OPTIONS: { key: Mode; Icon: typeof Sun; labelKey: string }[] = [
  { key: "light", Icon: Sun, labelKey: "theme.light" },
  { key: "dark", Icon: Moon, labelKey: "theme.dark" },
  { key: "system", Icon: Monitor, labelKey: "theme.system" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = OPTIONS.find((option) => option.key === theme) ?? OPTIONS[1];
  const CurrentIcon = current.Icon;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const chooseTheme = (mode: Mode) => {
    setTheme(mode);
    setOpen(false);
  };

  return (
    <div className="relative" ref={rootRef} data-no-translate>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={t("theme.toggle")}
        aria-haspopup="true"
        aria-expanded={open}
        title={t(current.labelKey)}
        className={cn(
          "inline-flex items-center justify-center rounded-xl border border-bg-border bg-bg-surface text-text-secondary shadow-sm transition-colors",
          "hover:bg-bg-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
          compact ? "h-9 w-9" : "h-10 w-10",
        )}
      >
        <CurrentIcon size={compact ? 17 : 19} strokeWidth={2} />
      </button>

      {open && (
        <div
          role="group"
          aria-label={t("theme.toggle")}
          className="absolute right-0 top-full z-[100] mt-2 w-44 overflow-hidden rounded-xl border border-bg-border bg-bg-surface p-1.5 shadow-xl shadow-black/10"
        >
          {OPTIONS.map(({ key, Icon, labelKey }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => chooseTheme(key)}
                aria-pressed={active}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-brand/10 font-semibold text-brand"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                )}
              >
                <Icon size={17} />
                <span className="flex-1">{t(labelKey)}</span>
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
