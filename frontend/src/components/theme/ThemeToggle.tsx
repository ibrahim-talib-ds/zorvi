"use client";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/design-system/cn";

type Mode = "light" | "dark" | "system";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  const options: { key: Mode; Icon: typeof Sun; label: string }[] = [
    { key: "light", Icon: Sun, label: t("theme.light") },
    { key: "dark", Icon: Moon, label: t("theme.dark") },
    { key: "system", Icon: Monitor, label: t("theme.system") },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-bg-border bg-bg-elevated/60 p-0.5"
      data-no-translate
      role="group"
      aria-label={t("theme.toggle")}
    >
      {options.map(({ key, Icon, label }) => {
        const active = theme === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTheme(key)}
            aria-label={label}
            title={label}
            aria-pressed={active}
            className={cn(
              "flex items-center justify-center rounded transition",
              compact ? "p-1" : "p-1.5",
              active
                ? "bg-brand text-white shadow-glow-brand"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-border/60"
            )}
          >
            <Icon size={compact ? 14 : 15} />
          </button>
        );
      })}
    </div>
  );
}
