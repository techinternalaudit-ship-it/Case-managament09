"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Employee = {
  eCode: string;
  name: string;
  email: string | null;
  mobileNumber: string | null;
  entity: string | null;
  grade: string | null;
  designation: string | null;
  department: string | null;
  city: string | null;
  state: string | null;
  hrbpName: string | null;
  hodName: string | null;
  hodEntity: string | null;
  l1ManagerName: string | null;
  l2ManagerName: string | null;
};

type FieldMap = Record<string, string>; // employee field → form input name

export function EcodeLookup({
  inputName,
  fieldMap,
  required,
  placeholder,
  defaultValue,
}: {
  inputName: string;
  fieldMap: FieldMap;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
  const [query, setQuery] = useState(defaultValue ?? "");
  const [results, setResults] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const lookup = useCallback(async (ecode: string) => {
    if (ecode.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?ecode=${encodeURIComponent(ecode)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(val: string) {
    setQuery(val);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookup(val), 300);
  }

  function handleSelect(emp: Employee) {
    setSelected(emp);
    setQuery(emp.eCode);
    setShowDropdown(false);

    // Auto-fill mapped form fields
    const form = containerRef.current?.closest("form");
    if (!form) return;

    for (const [empField, formField] of Object.entries(fieldMap)) {
      const input = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${formField}"]`);
      if (!input) continue;
      const val = (emp as Record<string, unknown>)[empField];
      if (val !== null && val !== undefined) {
        // Use native setter to trigger React's change detection
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set;
        if (nativeInputValueSetter && input instanceof HTMLInputElement) {
          nativeInputValueSetter.call(input, String(val));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
          input.value = String(val);
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        className="input"
        name={inputName}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (results.length > 0 && !selected) setShowDropdown(true); }}
        required={required}
        placeholder={placeholder || "Type E-code…"}
        autoComplete="off"
      />

      {/* Loading indicator */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Selected badge */}
      {selected && (
        <div className="mt-1.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 truncate">
            {selected.name} · {selected.grade || "—"} · {selected.entity || "—"}
          </span>
        </div>
      )}

      {/* Suggestion dropdown */}
      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-ink-200/60 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
          {results.map((emp) => (
            <button
              key={emp.eCode}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors border-b border-ink-100/40 dark:border-white/[0.04] last:border-b-0"
              onClick={() => handleSelect(emp)}
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-ink-100 dark:bg-white/[0.06] text-ink-600 dark:text-gray-400 grid place-items-center shrink-0">
                  <span className="text-[10px] font-bold">{emp.eCode}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-ink-900 dark:text-white truncate">{emp.name}</div>
                  <div className="text-[11px] text-ink-500 dark:text-gray-400 truncate">
                    {[emp.designation, emp.grade, emp.entity, emp.department].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {showDropdown && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-ink-200/60 dark:border-white/10 rounded-xl shadow-xl px-4 py-3">
          <p className="text-xs text-ink-400 dark:text-gray-500">No employee found for &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
