"use client";

import { useEffect, useState } from "react";

type ThemePreference = "system" | "light" | "dark";

const OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", preference);
}

export default function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme-preference");
    if (stored === "light" || stored === "dark" || stored === "system") {
      setPreference(stored);
      applyThemePreference(stored);
    } else {
      applyThemePreference("system");
    }
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyThemePreference("system");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const handleSelect = (value: ThemePreference) => {
    setPreference(value);
    window.localStorage.setItem("theme-preference", value);
    applyThemePreference(value);
  };

  return (
    <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--card)] p-4 shadow-[0_12px_24px_rgba(0,0,0,0.18)]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[var(--muted-strong)]">
        Theme
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const isActive = option.value === preference;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                isActive
                  ? "border-[var(--card-border-strong)] bg-[var(--card-alt)] text-[var(--foreground)]"
                  : "border-[var(--card-border)] bg-transparent text-[var(--muted)] hover:bg-[var(--card-alt)]"
              }`}
              aria-label={`${option.label} theme`}
            >
              {option.value === "light" && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="M4.93 4.93l1.41 1.41" />
                  <path d="M17.66 17.66l1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="M4.93 19.07l1.41-1.41" />
                  <path d="M17.66 6.34l1.41-1.41" />
                </svg>
              )}
              {option.value === "dark" && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.4a8.2 8.2 0 1 1-9.4-9.4 7 7 0 0 0 9.4 9.4Z" />
                </svg>
              )}
              {option.value === "system" && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="12" rx="2" />
                  <path d="M7 20h10" />
                  <path d="M9 16v4" />
                  <path d="M15 16v4" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
