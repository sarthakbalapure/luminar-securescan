import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ReportType } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { ReportsRepository } from "./reports.repository";
import { ReportsService } from "./reports.service";

const scan = {
  id: "scan-id",
  assetId: "asset-id",
  scanType: "WEBSITE_BASELINE",
  scanMode: "baseline",
  scanner: "internal",
  status: "COMPLETED",
  startedAt: new Date("2026-09-22T09:00:00.000Z"),
  completedAt: new Date("2026-09-22T09:05:00.000Z"),
  createdAt: new Date("2026-09-22T08:59:00.000Z"),
  createdBy: "user-id",
  securityScore: 82,
  summaryJson: { mediumCount: 1 },
  creator: { id: "user-id", name: "Ada", email: "ada@example.com" },
  asset: {
    id: "asset-id", name: "Marketing Site", url: "https://example.com", environment: "PRODUCTION", businessCriticality: "HIGH",
    project: { id: "project-id", name: "External Web", organization: { id: "org-id", name: "Acme Security" } },
  },
  jobs: [{ jobType: "SECURITY_HEADERS_CHECK", status: "COMPLETED", attempts: 1, errorMessage: null }],
  findings: [{
    id: "finding-id", title: "Content Security Policy header is missing", description: "CSP was not observed.", severity: "MEDIUM", status: "OPEN", source: "internal",
    cvssScore: 5.3, category: "Security Headers", owaspMapping: ["Security Misconfiguration"], cwe: "CWE-693",
    evidenceSummary: "Authorization: Bearer secret-token-value", businessImpact: "Injection issues can have broader impact without CSP.", technicalImpact: "Browsers do not have resource-loading constraints.", remediationSummary: "Add a reviewed CSP.",
    firstDetectedAt: new Date("2026-09-22T09:00:00.000Z"), lastDetectedAt: new Date("2026-09-22T09:00:00.000Z"),
    evidence: [{ evidenceType: "RESPONSE_HEADER", url: "https://example.com", requestSummary: "Cookie: session=secret", responseSummary: "HTTP 200", observedValue: "missing", expectedValue: "present" }],
    recommendations: [{ remediationText: "Add a CSP.", codeExample: "add_header Content-Security-Policy default-src-self;", retestSteps: "Confirm the header is present." }],
  }],
  reports: [],
};

const testStorage = resolve("tmp/report-tests");

describe("ReportsService", () => {
  const repository = {
    findAllForActor: vi.fn(), findByIdForActor: vi.fn(), reportExists: vi.fn(), findScanForReportForActor: vi.fn(), findPreviousScan: vi.fn(),
    upsertGenerating: vi.fn(), complete: vi.fn(), fail: vi.fn(), delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findPreviousScan.mockResolvedValue(null);
    repository.upsertGenerating.mockResolvedValue({ id: "report-id" });
    repository.complete.mockImplementation((_id: string, files: object) => ({
      id: "report-id", organizationId: "org-id", scanId: "scan-id", reportType: ReportType.FULL_SECURITY_AUDIT,
      reportStatus: "COMPLETED", generatedAt: new Date(), ...files, scan,
    }));
  });

  afterAll(async () => {
    await rm(testStorage, { recursive: true, force: true });
  });

  it("generates protected HTML, PDF, JSON, and CSV from the authorized scan", async () => {
    repository.findScanForReportForActor.mockResolvedValue(scan);
    const service = createService(repository);
    setPdfRenderer(service);

    const report = await service.generateForScan("scan-id", ReportType.FULL_SECURITY_AUDIT, { id: "user-id", role: "USER" }, { includeEvidence: true });

    expect(repository.findScanForReportForActor).toHaveBeenCalledWith("scan-id", "user-id", false);
    expect(repository.upsertGenerating).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-id", assetId: "asset-id", securityScore: 82, riskRating: "Good" }));
    expect(repository.complete).toHaveBeenCalledWith("report-id", expect.objectContaining({ htmlPath: "html/report-id.html", pdfPath: "pdf/report-id.pdf", jsonPath: "json/report-id.json", csvPath: "csv/report-id.csv" }));
    expect(report.htmlSnapshot).toContain("Content Security Policy header is missing");
    expect(report.htmlSnapshot).not.toContain("secret-token-value");
    expect(report.htmlSnapshot).not.toContain("session=secret");
  });

  it("rejects a scan outside the user's organization", async () => {
    repository.findScanForReportForActor.mockResolvedValue(null);
    const service = createService(repository);
    await expect(service.generateForScan("scan-id", ReportType.EXECUTIVE_SUMMARY, { id: "user-id", role: "USER" })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("allows an admin actor to request reports across organizations", async () => {
    repository.findScanForReportForActor.mockResolvedValue(scan);
    const service = createService(repository);
    setPdfRenderer(service);
    await service.generateForScan("scan-id", ReportType.TECHNICAL_FINDINGS, { id: "admin-id", role: "ADMIN" });
    expect(repository.findScanForReportForActor).toHaveBeenCalledWith("scan-id", "admin-id", true);
  });

  it("returns the explicit access denied error for another organization's report", async () => {
    repository.findByIdForActor.mockResolvedValue(null);
    repository.reportExists.mockResolvedValue(true);
    await expect(createService(repository).findById("report-id", { id: "user-id", role: "USER" })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("renders an authenticated PDF download from the stored snapshot", async () => {
    repository.findByIdForActor.mockResolvedValue(reportRecord());
    const service = createService(repository);
    setPdfRenderer(service);
    const download = await service.renderDownload("report-id", { id: "user-id", role: "USER" });
    expect(download.filename).toBe("luminar-securescan-full_security_audit-marketing-site.pdf");
    expect(download.pdf.toString()).toContain("%PDF");
  });

  it("forces a Basic report for Plus even when detailed options are requested", async () => {
    repository.findScanForReportForActor.mockResolvedValue(scan);
    const subscriptions = {
      overview: vi.fn().mockResolvedValue({
        subscription: { planCode: "PLUS", reportLevel: "BASIC" },
        fixRequestsRemaining: 0,
      }),
    };
    const service = createService(repository, subscriptions);
    setPdfRenderer(service);

    const report = await service.generateForScan("scan-id", ReportType.FULL_SECURITY_AUDIT, { id: "user-id", role: "USER" }, {
      includeTechnicalDetails: true,
      includeRemediation: true,
      includeEvidence: true,
      includeAppendix: true,
    });

    expect(repository.upsertGenerating).toHaveBeenCalledWith(expect.objectContaining({
      title: "Basic Security Report",
      metadata: expect.objectContaining({
        planCode: "PLUS",
        reportLevel: "BASIC",
        options: expect.objectContaining({ includeTechnicalDetails: false, includeRemediation: false, includeEvidence: false, includeAppendix: false }),
      }),
    }));
    expect(report.htmlSnapshot).toContain("Basic Security Report");
    expect(report.htmlSnapshot).toContain("Detailed remediation locked");
    expect(report.htmlSnapshot).not.toContain("Technical Impact");
  });

  it("keeps detailed remediation sections for Pro and Max reports", async () => {
    repository.findScanForReportForActor.mockResolvedValue(scan);
    const subscriptions = {
      overview: vi.fn().mockResolvedValue({
        subscription: { planCode: "PRO", reportLevel: "DETAILED" },
        fixRequestsRemaining: 0,
      }),
    };
    const service = createService(repository, subscriptions);
    setPdfRenderer(service);

    const report = await service.generateForScan("scan-id", ReportType.TECHNICAL_FINDINGS, { id: "user-id", role: "USER" }, { includeRemediation: true });

    expect(repository.upsertGenerating).toHaveBeenCalledWith(expect.objectContaining({ metadata: expect.objectContaining({ planCode: "PRO", reportLevel: "DETAILED" }) }));
    expect(report.htmlSnapshot).toContain("Detailed Findings");
    expect(report.htmlSnapshot).toContain("Technical Impact");
    expect(report.htmlSnapshot).toContain("Recommended Fix");
  });
});

function createService(repository: object, subscriptions?: object) {
  const config = { get: (key: string) => key === "REPORT_STORAGE_PATH" ? testStorage : undefined };
  return new ReportsService(repository as ReportsRepository, undefined, config as never, subscriptions as never);
}

function setPdfRenderer(service: ReportsService) {
  (service as unknown as { pdfRenderer: { render: (html: string) => Promise<Buffer> } }).pdfRenderer = { render: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 test")) };
}

function reportRecord() {
  return {
    id: "report-id", organizationId: "org-id", projectId: "project-id", assetId: "asset-id", generatedBy: "user-id", scanId: "scan-id",
    reportType: ReportType.FULL_SECURITY_AUDIT, reportStatus: "COMPLETED", title: "Full Security Audit Report", securityScore: 82, riskRating: "Good",
    severitySummary: {}, scannerSummary: {}, fileUrl: "/reports/report-id/download", htmlSnapshot: "<html><body>Report</body></html>", htmlPath: null, pdfPath: null, jsonPath: null, csvPath: null, fileSize: null,
    generatedAt: new Date(), updatedAt: new Date(), errorMessage: null, metadata: {},
    generator: scan.creator, organization: scan.asset.project.organization, project: scan.asset.project, asset: scan.asset, scan,
  };
}
