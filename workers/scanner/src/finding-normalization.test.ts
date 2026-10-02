import { describe, expect, it } from "vitest";
import {
  calculateSecurityScoreSummary,
  dedupeNormalizedFindings,
  mapOwasp,
  normalizeFinding,
  scoreSeverity,
} from "./finding-normalization";
import type { NormalizedFinding } from "./types";

function finding(severity: NormalizedFinding["severity"], title = `${severity} finding`): NormalizedFinding {
  return normalizeFinding({
    scannerName: "test",
    affectedUrl: "https://example.com",
    rawObservation: {
      title,
      severity,
      category: "Security Headers",
      evidenceSummary: "Observed evidence",
      remediationSummary: "Apply remediation.",
      retestSteps: "Retest the endpoint.",
    },
    evidence: { observedValue: "bad", expectedValue: "good" },
  });
}

describe("finding normalization and scoring", () => {
  it("normalizes raw observations into a consistent finding structure", () => {
    const normalized = normalizeFinding({
      scannerName: "securityHeadersCheck",
      affectedUrl: "https://example.com",
      rawObservation: {
        title: "Content Security Policy header is missing",
        category: "Security Headers",
        evidenceSummary: "Missing content-security-policy",
        remediationSummary: "Add a reviewed CSP.",
        factors: { misconfigurationType: "missing browser security header" },
      },
      evidence: { evidenceType: "RESPONSE_HEADER", observedValue: "missing", expectedValue: "present" },
    });

    expect(normalized.severity).toBe("MEDIUM");
    expect(normalized.owaspMapping).toContain("Security Misconfiguration");
    expect(normalized.evidence?.url).toBe("https://example.com");
    expect(normalized.recommendation?.retestSteps).toBeTruthy();
  });

  it("raises severity when risk factors indicate sensitive exposure", () => {
    expect(scoreSeverity("MEDIUM", {
      internetFacing: true,
      sensitiveDataExposure: true,
      easeOfExploitation: "HIGH",
      businessImpact: "HIGH",
    })).toBe("CRITICAL");
  });

  it("calculates score and grouped counts using the requested formula", () => {
    const summary = calculateSecurityScoreSummary([
      finding("CRITICAL"),
      finding("HIGH"),
      finding("MEDIUM"),
      finding("LOW"),
      finding("INFO"),
    ]);

    expect(summary.score).toBe(54.5);
    expect(summary).toMatchObject({
      criticalCount: 1,
      highCount: 1,
      mediumCount: 1,
      lowCount: 1,
      infoCount: 1,
      totalFindings: 5,
      riskTrend: "UNCHANGED",
    });
    expect(summary.groupedBySeverity.CRITICAL).toHaveLength(1);
  });

  it("maps common finding categories to OWASP categories", () => {
    expect(mapOwasp("TLS", "Expired certificate")).toContain("Cryptographic Failures");
    expect(mapOwasp("Cookie Security", "Session cookie missing HttpOnly")).toContain("Security Misconfiguration");
    expect(mapOwasp("Authentication", "Weak session")).toContain("Identification and Authentication Failures");
  });

  it("deduplicates findings by scan, asset, title, URL, and evidence", () => {
    const duplicate = finding("HIGH", "Missing HSTS");
    const unique = { ...duplicate, evidenceSummary: "Different evidence" };

    expect(dedupeNormalizedFindings([duplicate, { ...duplicate }, unique], "scan-id", "asset-id")).toHaveLength(2);
  });
});
