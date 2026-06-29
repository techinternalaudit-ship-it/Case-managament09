"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icon";

export function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={`fixed top-5 right-5 z-50 animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
      type === "success"
        ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
        : "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400"
    }`}>
      <Icon name={type === "success" ? "check" : "alert-circle"} className="h-4 w-4 shrink-0" />
      {message}
      <button onClick={() => setVisible(false)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
}
