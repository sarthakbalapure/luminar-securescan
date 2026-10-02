export const severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export const statuses = ["OPEN", "IN_PROGRESS", "RISK_ACCEPTED", "FALSE_POSITIVE", "FIXED", "RETEST_REQUIRED"] as const;

export type Severity = (typeof severities)[number];
export type FindingStatus = (typeof statuses)[number];

export function formatEnum(value?: string | null) {
  if (!value) return "N/A";
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value?: string | null) {
  if (!value) return "N/A";
  return new Date(value).toLocaleString();
}

export function severityTone(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-800 ring-red-200";
    case "HIGH":
      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "MEDIUM":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    case "LOW":
      return "bg-teal-100 text-teal-800 ring-teal-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function statusTone(status: string) {
  switch (status) {
    case "OPEN":
    case "FAILED":
      return "bg-red-50 text-red-700 ring-red-200";
    case "RUNNING":
    case "IN_PROGRESS":
    case "RETEST_REQUIRED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "COMPLETED":
    case "FIXED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "RISK_ACCEPTED":
    case "FALSE_POSITIVE":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

export function calculateSecurityScore(counts: Partial<Record<Severity, number>>) {
  const deductions =
    (counts.CRITICAL ?? 0) * 25 +
    (counts.HIGH ?? 0) * 12 +
    (counts.MEDIUM ?? 0) * 6 +
    (counts.LOW ?? 0) * 2 +
    (counts.INFO ?? 0) * 0.5;
  return Math.max(0, Math.round((100 - deductions) * 10) / 10);
}

export function riskRatingForScore(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Poor";
  return "Critical";
}
