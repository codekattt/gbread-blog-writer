"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("gbread-theme", theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const rootTheme = document.documentElement.dataset.theme;
      if (rootTheme === "dark" || rootTheme === "light") {
        setTheme(rootTheme);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleThemeChange = (nextTheme: Theme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1.5 shadow-[var(--color-shadow)] backdrop-blur-md">
      <span className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        Theme
      </span>
      <div className="inline-flex rounded-full bg-[var(--color-neutral-bg)] p-1">
        {(
          [
            { value: "light", label: "라이트" },
            { value: "dark", label: "다크" },
          ] as const
        ).map((option) => {
          const selected = theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleThemeChange(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                selected
                  ? "bg-[var(--color-panel-strong)] text-[var(--color-panel-strong-ink)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-elevated-soft)] hover:text-[var(--color-ink)]"
              }`}
              aria-pressed={selected}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
