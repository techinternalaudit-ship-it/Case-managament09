"use client";

import { useState, useCallback, useRef, useEffect } from "react";

type Respondent = {
  name: string;
  eCode: string;
  entity: string;
  grade: string;
};

type Employee = {
  eCode: string;
  name: string;
  entity: string | null;
  grade: string | null;
  designation: string | null;
  department: string | null;
};

function RespondentCard({
  respondent,
  index,
  onUpdate,
  onRemove,
}: {
  respondent: Respondent;
  index: number;
  onUpdate: (index: number, r: Respondent) => void;
  onRemove: (index: number) => void;
}) {
  const [query, setQuery] = useState(respondent.eCode);
  const [results, setResults] = useState<Employee[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const lookup = useCallback(async (ecode: string) => {
    if (ecode.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/employees?ecode=${encodeURIComponent(ecode)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowDropdown(data.length > 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  function handleEcodeChange(val: string) {
    setQuery(val);
    setSelected(null);
    onUpdate(index, { ...respondent, eCode: val });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => lookup(val), 300);
  }

  function handleSelect(emp: Employee) {
    setQuery(emp.eCode);
    setShowDropdown(false);
    setResults([]);
    setSelected(emp);
    onUpdate(index, {
      name: emp.name,
      eCode: emp.eCode,
      entity: emp.entity ?? "",
      grade: emp.grade ?? "",
    });
  }

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
    <div className="rounded-xl border border-ink-200/60 dark:border-white/[0.06] bg-white dark:bg-white/[0.01]">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-ink-50/80 dark:bg-white/[0.03] border-b border-ink-200/40 dark:border-white/[0.04]">
        <span className="text-xs font-bold text-ink-600 dark:text-gray-400 uppercase tracking-wider">
          Respondent {index + 2}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-400 hover:text-rose-500 transition-colors"
          onClick={() => onRemove(index)}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Remove
        </button>
      </div>

      {/* Card body — grid matching primary respondent */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* E-Code with lookup */}
        <div ref={containerRef} className="relative">
          <label className="label">E-Code</label>
          <div className="relative">
            <input
              className="input"
              placeholder="Type E-code to search…"
              value={query}
              onChange={(e) => handleEcodeChange(e.target.value)}
              onFocus={() => {
                if (results.length > 0 && !selected) setShowDropdown(true);
              }}
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-3.5 w-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

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
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-ink-200/60 dark:border-white/10 rounded-xl shadow-xl overflow-y-auto max-h-64">
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

          {/* No results */}
          {showDropdown && results.length === 0 && query.length >= 2 && !loading && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-ink-200/60 dark:border-white/10 rounded-xl shadow-xl px-4 py-3">
              <p className="text-xs text-ink-400 dark:text-gray-500">No employee found for &quot;{query}&quot;</p>
            </div>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            placeholder="Auto-filled from E-code"
            value={respondent.name}
            onChange={(e) => onUpdate(index, { ...respondent, name: e.target.value })}
          />
        </div>

        {/* Entity */}
        <div>
          <label className="label">Entity</label>
          <input
            className="input"
            placeholder="Auto-filled from E-code"
            value={respondent.entity}
            onChange={(e) => onUpdate(index, { ...respondent, entity: e.target.value })}
          />
        </div>

        {/* Grade */}
        <div>
          <label className="label">Grade</label>
          <input
            className="input"
            placeholder="Auto-filled from E-code"
            value={respondent.grade}
            onChange={(e) => onUpdate(index, { ...respondent, grade: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function RespondentTable({
  respondents,
  onChange,
}: {
  respondents: Respondent[];
  onChange: (respondents: Respondent[]) => void;
}) {
  const addRespondent = useCallback(() => {
    onChange([...respondents, { name: "", eCode: "", entity: "", grade: "" }]);
  }, [respondents, onChange]);

  const removeRespondent = useCallback(
    (index: number) => {
      onChange(respondents.filter((_, i) => i !== index));
    },
    [respondents, onChange]
  );

  const updateRespondent = useCallback(
    (index: number, r: Respondent) => {
      const next = [...respondents];
      next[index] = r;
      onChange(next);
    },
    [respondents, onChange]
  );

  return (
    <div className="space-y-3">
      {respondents.map((r, i) => (
        <RespondentCard
          key={i}
          respondent={r}
          index={i}
          onUpdate={updateRespondent}
          onRemove={removeRespondent}
        />
      ))}
      <button
        type="button"
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-ink-200/60 dark:border-white/[0.08] text-sm font-medium text-ink-500 dark:text-gray-400 hover:border-primary-300 hover:text-primary-600 dark:hover:border-primary-700 dark:hover:text-primary-400 transition-all w-full justify-center"
        onClick={addRespondent}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Another Respondent
      </button>
    </div>
  );
}
