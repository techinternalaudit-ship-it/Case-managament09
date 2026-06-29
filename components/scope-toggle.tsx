"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";

export function ScopeToggle({ scope }: { scope: "mine" | "all" }) {
  const router = useRouter();
  const [active, setActive] = useState(scope);

  useEffect(() => {
    setActive(scope);
  }, [scope]);

  function setScope(s: "mine" | "all") {
    setActive(s);
    document.cookie = `scope=${s};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex gap-0.5 bg-ink-100/60 dark:bg-white/[0.06] p-0.5 rounded-lg w-full">
      <button
        onClick={() => setScope("mine")}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
          active === "mine"
            ? "bg-white dark:bg-white/10 text-ink-900 dark:text-white shadow-soft"
            : "text-ink-400 dark:text-white/40 hover:text-ink-600 dark:hover:text-white/60"
        }`}
      >
        <Icon name="user" className="h-3 w-3" />
        My View
      </button>
      <button
        onClick={() => setScope("all")}
        className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ${
          active === "all"
            ? "bg-white dark:bg-white/10 text-ink-900 dark:text-white shadow-soft"
            : "text-ink-400 dark:text-white/40 hover:text-ink-600 dark:hover:text-white/60"
        }`}
      >
        <Icon name="users" className="h-3 w-3" />
        Overall
      </button>
    </div>
  );
}
