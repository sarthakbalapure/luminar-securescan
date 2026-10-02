import type { NormalizedFinding } from "./types";
import { normalizeFinding } from "./finding-normalization";

type FindingInput = {
  title: string;
  description: string;
  severity: NormalizedFinding["severity"];
  category: string;
  affectedUrl: string;
  evidenceSummary: string;
  businessImpact: string;
  technicalImpact: string;
  remediationSummary: string;
  retestSteps: string;
  owaspMapping?: string[];
  cwe?: string;
  evidenceType?: string;
  observedValue?: string;
  expectedValue?: string;
  responseSummary?: string;
  rawJson?: object;
  recommendationType?: string;
  source?: NormalizedFinding["source"];
  rawZapAlert?: object;
  rawNucleiResult?: object;
  templateId?: string;
  templateName?: string;
  matcherName?: string;
  extractedResults?: string[];
  curlCommand?: string;
  nucleiSeverity?: string;
  nucleiTags?: string[];
  nucleiClassification?: object;
  testedParameter?: string;
  injectionType?: string;
  sqlmapRisk?: string;
  sqlmapLevel?: string;
  rawSqlmapSummary?: object;
  zapRisk?: string;
  confidence?: string;
  solution?: string;
  reference?: string;
  cweId?: string;
  wascId?: string;
};

export function makeFinding(input: FindingInput): NormalizedFinding {
  const finding = normalizeFinding({
    scannerName: input.recommendationType ?? input.category,
    affectedUrl: input.affectedUrl,
    rawObservation: {
      title: input.title,
      description: input.description,
      severity: input.severity,
      category: input.category,
      evidenceSummary: input.evidenceSummary,
      businessImpact: input.businessImpact,
      technicalImpact: input.technicalImpact,
      remediationSummary: input.remediationSummary,
      retestSteps: input.retestSteps,
      cwe: input.cwe,
      owaspMapping: input.owaspMapping,
    },
    evidence: {
      evidenceType: input.evidenceType ?? input.category.toUpperCase().replace(/\s+/g, "_"),
      responseSummary: input.responseSummary,
      observedValue: input.observedValue ?? input.evidenceSummary,
      expectedValue: input.expectedValue,
      rawJson: input.rawJson,
    },
  });
  return {
    ...finding,
    source: input.source,
    rawZapAlert: input.rawZapAlert,
    rawNucleiResult: input.rawNucleiResult,
    templateId: input.templateId,
    templateName: input.templateName,
    matcherName: input.matcherName,
    extractedResults: input.extractedResults,
    curlCommand: input.curlCommand,
    nucleiSeverity: input.nucleiSeverity,
    nucleiTags: input.nucleiTags,
    nucleiClassification: input.nucleiClassification,
    testedParameter: input.testedParameter,
    injectionType: input.injectionType,
    sqlmapRisk: input.sqlmapRisk,
    sqlmapLevel: input.sqlmapLevel,
    rawSqlmapSummary: input.rawSqlmapSummary,
    zapRisk: input.zapRisk,
    confidence: input.confidence,
    solution: input.solution,
    reference: input.reference,
    cweId: input.cweId,
    wascId: input.wascId,
  };
}

export function severityToUpper(severity: string): NormalizedFinding["severity"] {
  const normalized = severity.toUpperCase();
  if (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(normalized)) {
    return normalized as NormalizedFinding["severity"];
  }
  return "INFO";
}
