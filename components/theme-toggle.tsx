"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

export function ThemeToggle({ theme }: { theme: "light" | "dark" }) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(theme === "dark");

  // Sync with server prop on navigation
  useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    // Update DOM immediately
    document.documentElement.classList.toggle("dark", next);
    // Persist in cookie
    document.cookie = `theme=${next ? "dark" : "light"};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    // Tell server to refresh (picks up new cookie on next render)
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-semibold transition-all duration-200 border border-ink-200/60 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-ink-600 dark:text-gray-400 hover:bg-ink-100 dark:hover:bg-white/[0.08] hover:text-ink-900 dark:hover:text-white shadow-soft"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Icon name={isDark ? "sun" : "moon"} className="h-3.5 w-3.5" />
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
