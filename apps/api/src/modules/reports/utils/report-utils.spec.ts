import { ReportType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { exportFindingsCsv } from "./report-csv-exporter";
import { buildReportData, calculateSecurityScore, defaultReportOptions, riskRatingFor, type ReportSourceScan } from "./report-data-builder";
import { exportReportJson } from "./report-json-exporter";
import { maskSensitiveData, maskSensitiveObject } from "./sensitive-data-masker";

const baseScan: ReportSourceScan = {
  id: "scan", scanType: "WEBSITE_BASELINE", scanner: "owasp_zap", scanMode: "zap_baseline", status: "COMPLETED", createdAt: new Date("2026-09-22T00:00:00Z"), securityScore: null,
  asset: { id: "asset", name: "Portal", url: "https://example.com", project: { id: "project", name: "Portal", organization: { id: "org", name: "Acme" } } },
  jobs: [], findings: [],
};
const user = { id: "user", name: "Ada", email: "ada@example.com" };

describe("report utilities", () => {
  it("calculates the documented weighted security score", () => expect(calculateSecurityScore({ critical: 1, high: 1, medium: 1, low: 1, info: 2 })).toBe(54));
  it("never calculates a score below zero", () => expect(calculateSecurityScore({ critical: 10, high: 0, medium: 0, low: 0, info: 0 })).toBe(0));
  it.each([[95, "Excellent"], [80, "Good"], [65, "Moderate"], [45, "Poor"], [20, "Critical"]])("maps score %s to %s", (score, rating) => expect(riskRatingFor(score as number)).toBe(rating));
  it("uses the stored scan score when available", () => expect(buildReportData({ ...baseScan, securityScore: 77 }, ReportType.FULL_SECURITY_AUDIT, user, defaultReportOptions(ReportType.FULL_SECURITY_AUDIT)).summary).toMatchObject({ securityScore: 77, scoreWasCalculated: false }));
  it("calculates severity totals from actual findings", () => {
    const data = buildReportData({ ...baseScan, findings: [finding("CRITICAL"), finding("HIGH"), finding("INFO")] }, ReportType.EXECUTIVE_SUMMARY, user, defaultReportOptions(ReportType.EXECUTIVE_SUMMARY));
    expect(data.summary.severitySummary).toEqual({ critical: 1, high: 1, medium: 0, low: 0, info: 1, total: 3 });
  });
  it("sorts top risks by severity", () => {
    const data = buildReportData({ ...baseScan, findings: [finding("LOW"), finding("CRITICAL"), finding("MEDIUM")] }, ReportType.EXECUTIVE_SUMMARY, user, defaultReportOptions(ReportType.EXECUTIVE_SUMMARY));
    expect(data.summary.topRisks.map((item) => item.severity)).toEqual(["CRITICAL", "MEDIUM", "LOW"]);
  });
  it("masks bearer tokens, passwords, API keys, and cookies", () => {
    const masked = maskSensitiveData("Authorization: Bearer abcdefghijklmnop password=hunter2 api_key=123456789 Cookie: session=secret");
    expect(masked).not.toMatch(/abcdefghijklmnop|hunter2|123456789|session=secret/);
  });
  it("masks sensitive object keys", () => expect(maskSensitiveObject({ token: "secret", nested: { password: "hidden" } })).toEqual({ token: "********", nested: { password: "********" } }));
  it("does not include raw scanner payload fields in JSON", () => {
    const data = buildReportData({ ...baseScan, findings: [finding("HIGH")] }, ReportType.TECHNICAL_FINDINGS, user, defaultReportOptions(ReportType.TECHNICAL_FINDINGS));
    const json = exportReportJson(data);
    expect(json).not.toMatch(/rawZapAlert|rawNucleiResult|rawSqlmapSummary|curlCommand/);
  });
  it("creates CSV with the required finding columns", () => {
    const data = buildReportData({ ...baseScan, findings: [finding("MEDIUM")] }, ReportType.TECHNICAL_FINDINGS, user, defaultReportOptions(ReportType.TECHNICAL_FINDINGS));
    expect(exportFindingsCsv(data)).toContain('"Finding ID","Title","Severity","Status","Source"');
  });
  it("compares previous and latest scans for retest reports", () => {
    const previous = { ...baseScan, id: "old", securityScore: 50, findings: [finding("HIGH", "Old issue")] };
    const latest = { ...baseScan, id: "new", findings: [finding("LOW", "New issue")] };
    const data = buildReportData(latest, ReportType.RETEST_REPORT, user, defaultReportOptions(ReportType.RETEST_REPORT), previous);
    expect(data.retest).toMatchObject({ previousScanId: "old", previousScore: 50, fixedFindings: ["Old issue"], newFindings: ["New issue"] });
  });
});

function finding(severity: string, title = `${severity} issue`) {
  return {
    id: `${severity}-${title}`, title, description: "Description", severity, status: "OPEN", source: "owasp_zap", category: "Security Misconfiguration", owaspMapping: ["A05"], cwe: "CWE-16", cvssScore: 5,
    evidenceSummary: "password=super-secret", businessImpact: "Business impact", technicalImpact: "Technical impact", remediationSummary: "Fix it", firstDetectedAt: new Date("2026-09-22T00:00:00Z"), lastDetectedAt: new Date("2026-09-22T00:00:00Z"),
    evidence: [{ evidenceType: "HTTP", url: "https://example.com", observedValue: "Authorization: Bearer secret-value", expectedValue: "safe" }], recommendations: [{ remediationText: "Fix it", retestSteps: "Retest" }],
  };
}
