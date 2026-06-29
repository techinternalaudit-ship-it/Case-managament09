const DEFAULT_SLA = Number(process.env.SLA_DAYS_DEFAULT ?? 30);

const SLA_BY_SEVERITY: Record<string, number> = {
  LOW: DEFAULT_SLA,
  MEDIUM: DEFAULT_SLA,
  HIGH: 21,
  CRITICAL: 14,
};

export type TatInput = {
  complaintDate: Date | string;
  closureDate?: Date | string | null;
  severity: string;
};

export type TatResult = {
  tatDays: number | null;
  caseAge: number;
  tatBreach: boolean;
  slaDays: number;
};

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function computeTAT(input: TatInput): TatResult {
  const slaDays = SLA_BY_SEVERITY[input.severity] ?? DEFAULT_SLA;
  const complaint = new Date(input.complaintDate);
  const now = new Date();
  const closure = input.closureDate ? new Date(input.closureDate) : null;

  if (closure) {
    const tatDays = daysBetween(complaint, closure);
    return {
      tatDays,
      caseAge: tatDays,
      tatBreach: tatDays > slaDays,
      slaDays,
    };
  }

  const caseAge = daysBetween(complaint, now);
  return {
    tatDays: null,
    caseAge,
    tatBreach: caseAge > slaDays,
    slaDays,
  };
}
