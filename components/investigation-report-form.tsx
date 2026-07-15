"use client";

import { useState, useCallback } from "react";

type Party = {
  name: string;
  partnerType: string;
  referredAs: string;
  idNumber: string;
  status: string;
};

type Allegation = {
  allegation: string;
  facts: string;
  recommendation: string;
};

type ReportData = {
  background: string;
  parties: Party[];
  executiveSummary: string;
  detailedFindings: string;
  allegations: Allegation[];
  conclusion: string;
  recommendation: string;
};

const EMPTY_PARTY: Party = {
  name: "",
  partnerType: "Employee",
  referredAs: "",
  idNumber: "",
  status: "",
};

const EMPTY_ALLEGATION: Allegation = {
  allegation: "",
  facts: "",
  recommendation: "",
};

const PARTNER_TYPES = ["Employee", "Customer", "Merchant", "Vendor"] as const;

function parseDefaultReport(json?: string): ReportData {
  if (!json) {
    return {
      background: "",
      parties: [{ ...EMPTY_PARTY }],
      executiveSummary: "",
      detailedFindings: "",
      allegations: [{ ...EMPTY_ALLEGATION }],
      conclusion: "",
      recommendation: "",
    };
  }
  try {
    const parsed = JSON.parse(json) as Partial<ReportData>;
    return {
      background: parsed.background ?? "",
      parties:
        parsed.parties && parsed.parties.length > 0
          ? parsed.parties
          : [{ ...EMPTY_PARTY }],
      executiveSummary: parsed.executiveSummary ?? "",
      detailedFindings: parsed.detailedFindings ?? "",
      allegations:
        parsed.allegations && parsed.allegations.length > 0
          ? parsed.allegations
          : [{ ...EMPTY_ALLEGATION }],
      conclusion: parsed.conclusion ?? "",
      recommendation: parsed.recommendation ?? "",
    };
  } catch {
    return {
      background: "",
      parties: [{ ...EMPTY_PARTY }],
      executiveSummary: "",
      detailedFindings: "",
      allegations: [{ ...EMPTY_ALLEGATION }],
      conclusion: "",
      recommendation: "",
    };
  }
}

export function InvestigationReportForm({
  caseId,
  escalationChannel,
  escalationDate,
  defaultReport,
  onSave,
}: {
  caseId: string;
  escalationChannel: string;
  escalationDate: string;
  defaultReport?: string;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const [report, setReport] = useState<ReportData>(() =>
    parseDefaultReport(defaultReport)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateField = useCallback(
    <K extends keyof ReportData>(key: K, value: ReportData[K]) => {
      setReport((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /* Party helpers */
  const updateParty = useCallback(
    (index: number, field: keyof Party, value: string) => {
      setReport((prev) => {
        const parties = [...prev.parties];
        parties[index] = { ...parties[index], [field]: value };
        return { ...prev, parties };
      });
    },
    []
  );

  const addParty = useCallback(() => {
    setReport((prev) => ({
      ...prev,
      parties: [...prev.parties, { ...EMPTY_PARTY }],
    }));
  }, []);

  const removeParty = useCallback((index: number) => {
    setReport((prev) => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  }, []);

  /* Allegation helpers */
  const updateAllegation = useCallback(
    (index: number, field: keyof Allegation, value: string) => {
      setReport((prev) => {
        const allegations = [...prev.allegations];
        allegations[index] = { ...allegations[index], [field]: value };
        return { ...prev, allegations };
      });
    },
    []
  );

  const addAllegation = useCallback(() => {
    setReport((prev) => ({
      ...prev,
      allegations: [...prev.allegations, { ...EMPTY_ALLEGATION }],
    }));
  }, []);

  const removeAllegation = useCallback((index: number) => {
    setReport((prev) => ({
      ...prev,
      allegations: prev.allegations.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("id", caseId);
      fd.set("reportJson", JSON.stringify(report));
      await onSave(fd);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Read-only escalation info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Escalation Channel</label>
          <input
            className="input"
            value={escalationChannel}
            readOnly
            disabled
          />
        </div>
        <div>
          <label className="label">Escalation Date</label>
          <input
            className="input"
            value={escalationDate}
            readOnly
            disabled
          />
        </div>
      </div>

      {/* Background */}
      <div>
        <label className="label">Background</label>
        <textarea
          className="input"
          rows={4}
          placeholder="Provide background context for this investigation..."
          value={report.background}
          onChange={(e) => updateField("background", e.target.value)}
        />
      </div>

      {/* Parties Involved */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Parties Involved</label>
          <button
            type="button"
            className="btn-secondary text-xs !px-3 !py-1.5"
            onClick={addParty}
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink-200/60 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 dark:bg-white/[0.03] text-left">
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Name
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Partner Type
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Referred to as
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  ID Number
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {report.parties.map((party, i) => (
                <tr
                  key={i}
                  className="border-t border-ink-100 dark:border-white/[0.04]"
                >
                  <td className="px-2 py-1.5">
                    <input
                      className="input !rounded-lg !py-1.5 !text-sm"
                      placeholder="Name"
                      value={party.name}
                      onChange={(e) => updateParty(i, "name", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      className="input !rounded-lg !py-1.5 !text-sm"
                      value={party.partnerType}
                      onChange={(e) =>
                        updateParty(i, "partnerType", e.target.value)
                      }
                    >
                      {PARTNER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input !rounded-lg !py-1.5 !text-sm"
                      placeholder="Referred to as"
                      value={party.referredAs}
                      onChange={(e) =>
                        updateParty(i, "referredAs", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input !rounded-lg !py-1.5 !text-sm"
                      placeholder="Employee ID / MID"
                      value={party.idNumber}
                      onChange={(e) =>
                        updateParty(i, "idNumber", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="input !rounded-lg !py-1.5 !text-sm"
                      placeholder="Status"
                      value={party.status}
                      onChange={(e) => updateParty(i, "status", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {report.parties.length > 1 && (
                      <button
                        type="button"
                        className="text-ink-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400 transition-colors"
                        title="Remove row"
                        onClick={() => removeParty(i)}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <label className="label">Executive Summary</label>
        <textarea
          className="input"
          rows={4}
          placeholder="Summarize the key findings of the investigation..."
          value={report.executiveSummary}
          onChange={(e) => updateField("executiveSummary", e.target.value)}
        />
      </div>

      {/* Detailed Findings */}
      <div>
        <label className="label">Detailed Findings</label>
        <textarea
          className="input"
          rows={6}
          placeholder="Provide detailed findings from the investigation..."
          value={report.detailedFindings}
          onChange={(e) => updateField("detailedFindings", e.target.value)}
        />
      </div>

      {/* Allegations / Issues */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Allegations / Issues</label>
          <button
            type="button"
            className="btn-secondary text-xs !px-3 !py-1.5"
            onClick={addAllegation}
          >
            + Add Row
          </button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-ink-200/60 dark:border-white/[0.06]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 dark:bg-white/[0.03] text-left">
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Allegation / Issue
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Facts noted during review
                </th>
                <th className="px-3 py-2 text-xs font-semibold text-ink-600 dark:text-gray-400 uppercase tracking-wide">
                  Recommendation
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {report.allegations.map((allegation, i) => (
                <tr
                  key={i}
                  className="border-t border-ink-100 dark:border-white/[0.04]"
                >
                  <td className="px-2 py-1.5">
                    <textarea
                      className="input !rounded-lg !py-1.5 !text-sm"
                      rows={2}
                      placeholder="Allegation or issue"
                      value={allegation.allegation}
                      onChange={(e) =>
                        updateAllegation(i, "allegation", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <textarea
                      className="input !rounded-lg !py-1.5 !text-sm"
                      rows={2}
                      placeholder="Facts noted during review"
                      value={allegation.facts}
                      onChange={(e) =>
                        updateAllegation(i, "facts", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <textarea
                      className="input !rounded-lg !py-1.5 !text-sm"
                      rows={2}
                      placeholder="Recommendation"
                      value={allegation.recommendation}
                      onChange={(e) =>
                        updateAllegation(i, "recommendation", e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    {report.allegations.length > 1 && (
                      <button
                        type="button"
                        className="text-ink-400 hover:text-rose-500 dark:text-gray-500 dark:hover:text-rose-400 transition-colors"
                        title="Remove row"
                        onClick={() => removeAllegation(i)}
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conclusion */}
      <div>
        <label className="label">Conclusion</label>
        <textarea
          className="input"
          rows={4}
          placeholder="State your conclusions based on the findings..."
          value={report.conclusion}
          onChange={(e) => updateField("conclusion", e.target.value)}
        />
      </div>

      {/* Recommendation */}
      <div>
        <label className="label">Recommendation</label>
        <textarea
          className="input"
          rows={4}
          placeholder="Provide recommendations for action..."
          value={report.recommendation}
          onChange={(e) => updateField("recommendation", e.target.value)}
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving...
            </span>
          ) : (
            "Save Report"
          )}
        </button>
      </div>
    </div>
  );
}
