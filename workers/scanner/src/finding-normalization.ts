import type { NormalizedFinding } from "./types";
import { generateTemplateRecommendation } from "./recommendation-engine";

export type Severity = NormalizedFinding["severity"];

export type SeverityFactors = {
  internetFacing?: boolean;
  sensitiveDataExposure?: boolean;
  authenticationSessionImpact?: boolean;
  easeOfExploitation?: "LOW" | "MEDIUM" | "HIGH";
  businessImpact?: "LOW" | "MEDIUM" | "HIGH";
  knownVulnerabilityIndicator?: boolean;
  misconfigurationType?: string;
  complianceImpact?: boolean;
};

export type RawObservation = {
  title: string;
  description?: string;
  severity?: Severity;
  category?: string;
  owaspMapping?: string[];
  cwe?: string;
  evidenceSummary?: string;
  businessImpact?: string;
  technicalImpact?: string;
  remediationSummary?: string;
  retestSteps?: string;
  factors?: SeverityFactors;
};

export type FindingNormalizationInput = {
  scannerName: string;
  rawObservation: RawObservation;
  affectedUrl: string;
  evidence: {
    evidenceType?: string;
    requestSummary?: string;
    responseSummary?: string;
    observedValue?: string;
    expectedValue?: string;
    rawJson?: object;
  };
};

export type SecurityScoreSummary = {
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  totalFindings: number;
  riskTrend: "UNCHANGED";
  groupedBySeverity: Record<Severity, NormalizedFinding[]>;
};

const severityOrder: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const scorePenalty: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 12,
  MEDIUM: 6,
  LOW: 2,
  INFO: 0.5,
};

export function normalizeFinding(input: FindingNormalizationInput): NormalizedFinding {
  const raw = input.rawObservation;
  const category = raw.category ?? inferCategory(raw.title, raw.evidenceSummary ?? "");
  const severity = scoreSeverity(raw.severity ?? inferBaseSeverity(raw.title, category), raw.factors ?? {});
  const owaspMapping = raw.owaspMapping?.length ? raw.owaspMapping : mapOwasp(category, raw.title);
  const evidenceSummary = raw.evidenceSummary ?? input.evidence.observedValue ?? "Security-relevant condition observed.";
  const recommendation = generateTemplateRecommendation({
    scannerName: input.scannerName,
    title: raw.title,
    category,
    severity,
    affectedUrl: input.affectedUrl,
    evidenceSummary,
    observedValue: input.evidence.observedValue,
    expectedValue: input.evidence.expectedValue,
    owaspMapping,
    cwe: raw.cwe,
  });

  return {
    title: raw.title,
    description: raw.description ?? raw.technicalImpact ?? raw.title,
    severity,
    category,
    owaspMapping,
    cwe: raw.cwe,
    evidenceSummary,
    businessImpact: raw.businessImpact ?? recommendation.businessImpact,
    technicalImpact: raw.technicalImpact ?? recommendation.technicalImpact,
    remediationSummary: raw.remediationSummary ?? recommendation.recommendedFix,
    evidence: {
      evidenceType: input.evidence.evidenceType ?? category.toUpperCase().replace(/\s+/g, "_"),
      url: input.affectedUrl,
      requestSummary: input.evidence.requestSummary,
      responseSummary: input.evidence.responseSummary,
      observedValue: input.evidence.observedValue ?? raw.evidenceSummary,
      expectedValue: input.evidence.expectedValue,
      rawJson: {
        scannerName: input.scannerName,
        ...(input.evidence.rawJson ?? {}),
      },
    },
    recommendation: {
      recommendationType: recommendation.recommendationType,
      remediationText: recommendation.remediationText,
      retestSteps: raw.retestSteps ?? recommendation.retestSteps,
      codeExample: recommendation.codeExample,
    },
  };
}

export function scoreSeverity(baseSeverity: Severity, factors: SeverityFactors): Severity {
  let score = severityOrder[baseSeverity];
  if (factors.sensitiveDataExposure) score += 2;
  if (factors.authenticationSessionImpact) score += 1;
  if (factors.knownVulnerabilityIndicator) score += 1;
  if (factors.complianceImpact) score += 1;
  if (factors.internetFacing && baseSeverity !== "INFO") score += 1;
  if (factors.easeOfExploitation === "HIGH") score += 1;
  if (factors.businessImpact === "HIGH") score += 1;
  if (factors.misconfigurationType?.toLowerCase().includes("exposed secret")) score += 2;

  const capped = Math.max(0, Math.min(4, score));
  return (Object.keys(severityOrder) as Severity[]).find((severity) => severityOrder[severity] === capped) ?? "INFO";
}

export function calculateSecurityScoreSummary(findings: NormalizedFinding[]): SecurityScoreSummary {
  const groupedBySeverity: Record<Severity, NormalizedFinding[]> = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
    INFO: [],
  };
  for (const finding of findings) groupedBySeverity[finding.severity].push(finding);

  const totalPenalty = findings.reduce((sum, finding) => sum + scorePenalty[finding.severity], 0);
  return {
    score: Math.max(0, Math.min(100, 100 - totalPenalty)),
    criticalCount: groupedBySeverity.CRITICAL.length,
    highCount: groupedBySeverity.HIGH.length,
    mediumCount: groupedBySeverity.MEDIUM.length,
    lowCount: groupedBySeverity.LOW.length,
    infoCount: groupedBySeverity.INFO.length,
    totalFindings: findings.length,
    riskTrend: "UNCHANGED",
    groupedBySeverity,
  };
}

export function findingDedupeKey(finding: NormalizedFinding, scanId: string, assetId: string) {
  return [
    scanId,
    assetId,
    normalizeKeyPart(finding.title),
    normalizeKeyPart(finding.evidence?.url ?? ""),
    normalizeKeyPart(finding.evidenceSummary),
  ].join("|");
}

export function issueRetestKey(finding: NormalizedFinding | {
  title: string;
  evidenceSummary: string;
  evidence?: Array<{ url: string | null }> | { url?: string | null };
}) {
  const evidence = Array.isArray(finding.evidence) ? finding.evidence[0] : finding.evidence;
  return [
    normalizeKeyPart(finding.title),
    normalizeKeyPart(evidence?.url ?? ""),
    normalizeKeyPart(finding.evidenceSummary),
  ].join("|");
}

export function dedupeNormalizedFindings(findings: NormalizedFinding[], scanId: string, assetId: string) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = findingDedupeKey(finding, scanId, assetId);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mapOwasp(category: string, title: string): string[] {
  const text = `${category} ${title}`.toLowerCase();
  if (text.includes("access control")) return ["Broken Access Control"];
  if (text.includes("tls") || text.includes("https") || text.includes("certificate") || text.includes("crypto")) return ["Cryptographic Failures"];
  if (text.includes("injection")) return ["Injection"];
  if (text.includes("design")) return ["Insecure Design"];
  if (text.includes("header") || text.includes("cookie") || text.includes("exposed") || text.includes("misconfiguration")) return ["Security Misconfiguration"];
  if (text.includes("component") || text.includes("outdated")) return ["Vulnerable and Outdated Components"];
  if (text.includes("auth") || text.includes("session")) return ["Identification and Authentication Failures"];
  if (text.includes("integrity")) return ["Software and Data Integrity Failures"];
  if (text.includes("logging") || text.includes("monitoring")) return ["Security Logging and Monitoring Failures"];
  if (text.includes("ssrf") || text.includes("server-side request forgery")) return ["Server-Side Request Forgery"];
  return ["Security Misconfiguration"];
}

function inferBaseSeverity(title: string, category: string): Severity {
  const text = `${title} ${category}`.toLowerCase();
  if (text.includes(".env") || text.includes(".git/config")) return "CRITICAL";
  if (text.includes("no https") || text.includes("http instead of https") || text.includes("expired certificate")) return "HIGH";
  if (text.includes("hsts") || text.includes("csp") || text.includes("content security policy") || text.includes("secure flag")) return "MEDIUM";
  if (text.includes("referrer-policy") || text.includes("sensitive-looking")) return "LOW";
  return "INFO";
}

function inferCategory(title: string, evidence: string) {
  const text = `${title} ${evidence}`.toLowerCase();
  if (text.includes("cookie") || text.includes("session")) return "Cookie Security";
  if (text.includes("tls") || text.includes("certificate")) return "TLS";
  if (text.includes("https")) return "Transport Security";
  if (text.includes("header") || text.includes("policy")) return "Security Headers";
  if (text.includes("exposed") || text.includes(".env") || text.includes(".git")) return "Exposed Files";
  return "Security Misconfiguration";
}

function normalizeKeyPart(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
