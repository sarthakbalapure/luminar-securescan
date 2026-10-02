import type { ReportType } from "@prisma/client";
import { maskSensitiveData } from "./sensitive-data-masker";

export type ReportOptions = {
  includeExecutiveSummary: boolean;
  includeTechnicalDetails: boolean;
  includeRemediation: boolean;
  includeEvidence: boolean;
  includeAppendix: boolean;
};

export type ReportSourceScan = {
  id: string;
  scanType: string;
  scanner?: string | null;
  scanMode?: string | null;
  status: string;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  securityScore?: unknown;
  summaryJson?: unknown;
  asset: {
    id: string;
    name: string;
    url: string;
    environment?: string | null;
    businessCriticality?: string | null;
    project: {
      id: string;
      name: string;
      organization: { id: string; name: string };
    };
  };
  creator?: { id: string; name: string; email: string };
  jobs: Array<{ jobType: string; status: string; attempts: number; errorMessage?: string | null }>;
  findings: ReportSourceFinding[];
};

export type ReportSourceFinding = {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source?: string | null;
  category: string;
  owaspMapping: string[];
  cwe?: string | null;
  cvssScore?: unknown;
  evidenceSummary: string;
  businessImpact: string;
  technicalImpact: string;
  remediationSummary: string;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  evidence: Array<{
    evidenceType: string;
    url?: string | null;
    requestSummary?: string | null;
    responseSummary?: string | null;
    observedValue?: string | null;
    expectedValue?: string | null;
  }>;
  recommendations: Array<{ remediationText: string; codeExample?: string | null; retestSteps: string }>;
};

export type SafeReportFinding = ReturnType<typeof sanitizeFinding>;

export type ReportData = {
  reportMetadata: {
    reportType: ReportType;
    title: string;
    generatedAt: string;
    generatedBy: { id: string; name: string; email: string };
    options: ReportOptions;
    reportLevel: "BASIC" | "DETAILED";
    planCode: "PLUS" | "PRO" | "MAX" | null;
    upgradeNote: string | null;
    fixRequestsRemaining: number | null;
  };
  organization: { id: string; name: string };
  project: { id: string; name: string };
  asset: { id: string; name: string; url: string; environment: string; businessCriticality: string };
  scan: {
    id: string;
    scanType: string;
    status: string;
    scanner: string;
    scannerLabel: string;
    scanMode: string;
    startedAt: string | null;
    completedAt: string | null;
    jobs: ReportSourceScan["jobs"];
  };
  summary: {
    securityScore: number;
    scoreWasCalculated: boolean;
    riskRating: string;
    severitySummary: Record<"critical" | "high" | "medium" | "low" | "info" | "total", number>;
    topRisks: SafeReportFinding[];
    dynamicSummary: string;
  };
  remediationPlan: Array<{ timeframe: string; findings: SafeReportFinding[] }>;
  findings: SafeReportFinding[];
  retest: {
    previousScanId: string | null;
    previousScore: number | null;
    latestScore: number;
    fixedFindings: string[];
    openFindings: string[];
    newFindings: string[];
    riskAcceptedFindings: string[];
  } | null;
};

const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };

export function buildReportData(
  scan: ReportSourceScan,
  reportType: ReportType,
  generatedBy: { id: string; name: string; email: string },
  options: ReportOptions,
  previousScan?: ReportSourceScan | null,
): ReportData {
  const findings = [...scan.findings]
    .sort((left, right) => (severityOrder[left.severity] ?? 99) - (severityOrder[right.severity] ?? 99) || left.title.localeCompare(right.title))
    .map(sanitizeFinding);
  const severitySummary = summarizeSeverity(findings);
  const storedScore = Number(scan.securityScore);
  const scoreWasCalculated = !Number.isFinite(storedScore);
  const securityScore = scoreWasCalculated ? calculateSecurityScore(severitySummary) : clamp(storedScore);
  const riskRating = riskRatingFor(securityScore);

  return {
    reportMetadata: {
      reportType,
      title: reportTitle(reportType),
      generatedAt: new Date().toISOString(),
      generatedBy,
      options,
      reportLevel: "DETAILED",
      planCode: null,
      upgradeNote: null,
      fixRequestsRemaining: null,
    },
    organization: scan.asset.project.organization,
    project: { id: scan.asset.project.id, name: scan.asset.project.name },
    asset: {
      id: scan.asset.id,
      name: scan.asset.name,
      url: scan.asset.url,
      environment: scan.asset.environment ?? "PRODUCTION",
      businessCriticality: scan.asset.businessCriticality ?? "MEDIUM",
    },
    scan: {
      id: scan.id,
      scanType: scan.scanType,
      status: scan.status,
      scanner: scan.scanner ?? "internal",
      scannerLabel: scannerLabel(scan.scanner),
      scanMode: scan.scanMode ?? "baseline",
      startedAt: scan.startedAt?.toISOString() ?? null,
      completedAt: scan.completedAt?.toISOString() ?? null,
      jobs: scan.jobs.map((job) => ({ ...job, errorMessage: maskSensitiveData(job.errorMessage, 500) || null })),
    },
    summary: {
      securityScore,
      scoreWasCalculated,
      riskRating,
      severitySummary,
      topRisks: findings.slice(0, 5),
      dynamicSummary: `The scan identified ${severitySummary.critical} Critical, ${severitySummary.high} High, ${severitySummary.medium} Medium, ${severitySummary.low} Low, and ${severitySummary.info} Informational findings. The overall security posture is rated as ${riskRating} based on the security score of ${securityScore}/100.`,
    },
    remediationPlan: buildRemediationPlan(findings),
    findings,
    retest: previousScan ? buildRetestSummary(previousScan, findings, securityScore) : null,
  };
}

export function defaultReportOptions(reportType: ReportType): ReportOptions {
  const value = String(reportType);
  const executiveOnly = value === "EXECUTIVE" || value === "EXECUTIVE_SUMMARY";
  const technicalOnly = value === "TECHNICAL" || value === "TECHNICAL_FINDINGS";
  return {
    includeExecutiveSummary: !technicalOnly,
    includeTechnicalDetails: !executiveOnly,
    includeRemediation: true,
    includeEvidence: !executiveOnly,
    includeAppendix: value === "FULL" || value === "FULL_SECURITY_AUDIT",
  };
}

export function calculateSecurityScore(summary: { critical: number; high: number; medium: number; low: number; info: number }) {
  return clamp(100 - summary.critical * 25 - summary.high * 12 - summary.medium * 6 - summary.low * 2 - summary.info * 0.5);
}

export function riskRatingFor(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Poor";
  return "Critical";
}

export function reportTitle(reportType: ReportType) {
  const value = String(reportType);
  if (value === "EXECUTIVE" || value === "EXECUTIVE_SUMMARY") return "Executive Summary Report";
  if (value === "TECHNICAL" || value === "TECHNICAL_FINDINGS") return "Technical Findings Report";
  if (value === "RETEST_REPORT") return "Security Retest Report";
  return "Full Security Audit Report";
}

function sanitizeFinding(finding: ReportSourceFinding) {
  const recommendation = finding.recommendations[0];
  const evidence = finding.evidence.map((item) => ({
    evidenceType: item.evidenceType,
    url: item.url ?? null,
    requestSummary: maskSensitiveData(item.requestSummary, 1000) || null,
    responseSummary: maskSensitiveData(item.responseSummary, 1000) || null,
    observedValue: maskSensitiveData(item.observedValue, 1000) || null,
    expectedValue: maskSensitiveData(item.expectedValue, 1000) || null,
  }));
  return {
    id: finding.id,
    title: maskSensitiveData(finding.title, 300),
    description: maskSensitiveData(finding.description),
    severity: finding.severity,
    status: finding.status,
    source: finding.source ?? "internal",
    sourceLabel: scannerLabel(finding.source),
    affectedUrl: evidence.find((item) => item.url)?.url ?? null,
    category: finding.category,
    owaspMapping: finding.owaspMapping,
    cwe: finding.cwe ?? null,
    cvssScore: finding.cvssScore === null || finding.cvssScore === undefined ? null : Number(finding.cvssScore),
    evidenceSummary: maskSensitiveData(finding.evidenceSummary),
    evidence,
    businessImpact: maskSensitiveData(finding.businessImpact),
    technicalImpact: maskSensitiveData(finding.technicalImpact),
    remediationSummary: maskSensitiveData(recommendation?.remediationText ?? finding.remediationSummary),
    codeExample: maskSensitiveData(recommendation?.codeExample, 5000) || null,
    retestSteps: maskSensitiveData(recommendation?.retestSteps ?? "Run a new authorized scan and confirm the finding no longer appears."),
    firstDetectedAt: finding.firstDetectedAt.toISOString(),
    lastDetectedAt: finding.lastDetectedAt.toISOString(),
  };
}

function summarizeSeverity(findings: SafeReportFinding[]) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: findings.length };
  for (const finding of findings) {
    const key = finding.severity.toLowerCase() as keyof typeof summary;
    if (key !== "total" && key in summary) summary[key] += 1;
  }
  return summary;
}

function buildRemediationPlan(findings: SafeReportFinding[]) {
  const urgentPattern = /exposed|secret|sql injection|authentication|session|sensitive file/i;
  const immediate = findings.filter((finding) => finding.severity === "CRITICAL" || urgentPattern.test(`${finding.title} ${finding.category}`));
  const shortTerm = findings.filter((finding) => finding.severity === "HIGH" && !immediate.some((item) => item.id === finding.id));
  const mediumTerm = findings.filter((finding) => finding.severity === "MEDIUM");
  const backlog = findings.filter((finding) => finding.severity === "LOW" || finding.severity === "INFO");
  return [
    { timeframe: "Immediate Actions - 24 to 48 Hours", findings: immediate },
    { timeframe: "Short-Term Actions - 7 Days", findings: shortTerm },
    { timeframe: "Medium-Term Actions - 30 Days", findings: mediumTerm },
    { timeframe: "Backlog / Best Practice", findings: backlog },
  ];
}

function buildRetestSummary(previousScan: ReportSourceScan, findings: SafeReportFinding[], latestScore: number) {
  const currentTitles = new Set(findings.map((finding) => finding.title.toLowerCase()));
  const previousTitles = new Set(previousScan.findings.map((finding) => maskSensitiveData(finding.title, 300).toLowerCase()));
  const previousScoreValue = Number(previousScan.securityScore);
  return {
    previousScanId: previousScan.id,
    previousScore: Number.isFinite(previousScoreValue) ? clamp(previousScoreValue) : null,
    latestScore,
    fixedFindings: previousScan.findings.filter((finding) => !currentTitles.has(maskSensitiveData(finding.title, 300).toLowerCase())).map((finding) => maskSensitiveData(finding.title, 300)),
    openFindings: findings.filter((finding) => !["FIXED", "FALSE_POSITIVE", "RISK_ACCEPTED"].includes(finding.status)).map((finding) => finding.title),
    newFindings: findings.filter((finding) => !previousTitles.has(finding.title.toLowerCase())).map((finding) => finding.title),
    riskAcceptedFindings: findings.filter((finding) => finding.status === "RISK_ACCEPTED").map((finding) => finding.title),
  };
}

function scannerLabel(source?: string | null) {
  if (source === "owasp_zap") return "OWASP ZAP";
  if (source === "nuclei") return "Nuclei";
  if (source === "sqlmap") return "sqlmap";
  return "Internal Baseline Scanner";
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value * 10) / 10));
}
