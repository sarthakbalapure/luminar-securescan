import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ReportType } from "@prisma/client";
import { resolve } from "node:path";
import { PrismaService } from "../../prisma.service";
import type { AuthenticatedUser } from "../auth/current-user.decorator";
import type { GenerateReportDto } from "./dto/generate-report.dto";
import { type ReportRecord, type ReportScanRecord, ReportsRepository } from "./reports.repository";
import { exportFindingsCsv } from "./utils/report-csv-exporter";
import { buildReportData, defaultReportOptions, reportTitle, type ReportData, type ReportOptions, type ReportSourceScan } from "./utils/report-data-builder";
import { renderReportHtml } from "./utils/report-html-template";
import { exportReportJson } from "./utils/report-json-exporter";
import { PlaywrightPdfGenerator, type PdfRenderer } from "./utils/report-pdf-generator";
import { ReportStorage } from "./utils/report-storage";
import { maskSensitiveData } from "./utils/sensitive-data-masker";
import { SubscriptionService } from "../subscriptions/subscription.service";

type Actor = Pick<AuthenticatedUser, "id" | "role"> | string;

@Injectable()
export class ReportsService {
  private pdfRenderer: PdfRenderer = new PlaywrightPdfGenerator();

  constructor(
    private readonly reports: ReportsRepository,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly subscriptions?: SubscriptionService,
  ) {}

  findAll(actor: Actor) {
    const identity = actorIdentity(actor);
    return this.reports.findAllForActor(identity.id, identity.isAdmin);
  }

  async findById(id: string, actor: Actor) {
    const identity = actorIdentity(actor);
    const report = await this.reports.findByIdForActor(id, identity.id, identity.isAdmin);
    if (report) return report;
    if (await this.reports.reportExists(id)) {
      throw new ForbiddenException("Access denied. You do not have permission to access this report.");
    }
    throw new NotFoundException("Report not found.");
  }

  async generateForScan(scanId: string, reportType: ReportType, actor: Actor, dto: Partial<GenerateReportDto> = {}, expectedAssetId?: string) {
    if (!this.enabled()) throw new BadRequestException("Report generation is disabled.");
    if (!Object.values(ReportType).includes(reportType)) throw new BadRequestException("Invalid report type.");

    const identity = actorIdentity(actor);
    const scan = await this.reports.findScanForReportForActor(scanId, identity.id, identity.isAdmin);
    if (!scan) throw new NotFoundException("Scan not found or you do not have access.");
    if (expectedAssetId && expectedAssetId !== scan.assetId) throw new BadRequestException("The selected asset does not match this scan.");
    if (scan.status !== "COMPLETED") throw new BadRequestException("Reports can only be generated for completed scans.");
    if (scan.findings.length > this.maxFindings()) throw new BadRequestException(`This scan exceeds the report limit of ${this.maxFindings()} findings.`);

    const previousScan = reportType === ReportType.RETEST_REPORT ? await this.reports.findPreviousScan(scan.assetId, scan.createdAt) : null;
    const subscriptionOverview = this.subscriptions
      ? await this.subscriptions.overview(scan.asset.project.organization.id)
      : null;
    const isBasicReport = subscriptionOverview?.subscription.reportLevel === "BASIC";
    const options = isBasicReport
      ? { includeExecutiveSummary: true, includeTechnicalDetails: false, includeRemediation: false, includeEvidence: false, includeAppendix: false }
      : mergeOptions(reportType, dto);
    const reportData = buildReportData(scan as unknown as ReportSourceScan, reportType, scan.creator, options, previousScan as unknown as ReportSourceScan | null);
    if (subscriptionOverview) {
      reportData.reportMetadata.reportLevel = subscriptionOverview.subscription.reportLevel;
      reportData.reportMetadata.planCode = subscriptionOverview.subscription.planCode;
      reportData.reportMetadata.fixRequestsRemaining = subscriptionOverview.fixRequestsRemaining;
      if (isBasicReport) {
        reportData.reportMetadata.title = "Basic Security Report";
        reportData.reportMetadata.upgradeNote = "Upgrade to Pro or Max to unlock detailed remediation steps and developer-ready fix guidance.";
      }
    }
    const pending = await this.reports.upsertGenerating({
      scanId: scan.id,
      organizationId: scan.asset.project.organization.id,
      projectId: scan.asset.project.id,
      assetId: scan.asset.id,
      generatedBy: identity.id,
      reportType,
      title: reportData.reportMetadata.title,
      securityScore: reportData.summary.securityScore,
      riskRating: reportData.summary.riskRating,
      severitySummary: reportData.summary.severitySummary,
      scannerSummary: scannerSummary(reportData),
      metadata: {
        options,
        scoreWasCalculated: reportData.summary.scoreWasCalculated,
        reportLevel: reportData.reportMetadata.reportLevel,
        planCode: reportData.reportMetadata.planCode,
      },
    });

    await this.audit(scan.asset.project.organization.id, identity.id, "REPORT_GENERATION_STARTED", pending.id, reportData);
    const writtenPaths: string[] = [];
    try {
      const html = this.renderHtmlData(reportData);
      const json = exportReportJson(reportData);
      const csv = exportFindingsCsv(reportData);
      const pdf = await this.pdfRenderer.render(html);
      const storage = this.storage();
      const htmlPath = await storage.write(pending.id, "html", html); writtenPaths.push(htmlPath);
      const pdfPath = await storage.write(pending.id, "pdf", pdf); writtenPaths.push(pdfPath);
      const jsonPath = await storage.write(pending.id, "json", json); writtenPaths.push(jsonPath);
      const csvPath = await storage.write(pending.id, "csv", csv); writtenPaths.push(csvPath);
      const report = await this.reports.complete(pending.id, { htmlPath, pdfPath, jsonPath, csvPath, fileSize: pdf.length, htmlSnapshot: html });
      await this.audit(scan.asset.project.organization.id, identity.id, "REPORT_GENERATION_COMPLETED", report.id, reportData, { fileSize: pdf.length });
      await this.audit(scan.asset.project.organization.id, identity.id, isBasicReport ? "REPORT_GENERATED_BASIC" : "REPORT_GENERATED_DETAILED", report.id, reportData, { fileSize: pdf.length });
      return report;
    } catch (error) {
      await this.storage().deleteMany(writtenPaths).catch(() => undefined);
      const safeError = maskSensitiveData(error instanceof Error ? error.message : "Report generation failed.", 500);
      await this.reports.fail(pending.id, safeError).catch(() => undefined);
      await this.audit(scan.asset.project.organization.id, identity.id, "REPORT_GENERATION_FAILED", pending.id, reportData, { error: safeError }).catch(() => undefined);
      throw new InternalServerErrorException("Report generation failed. Please try again or contact support.");
    }
  }

  async renderDownload(id: string, actor: Actor) {
    const report = await this.findById(id, actor);
    this.ensureCompleted(report);
    const pdf = report.pdfPath ? await this.readStored(report.pdfPath, "Report PDF file is missing.") : await this.pdfRenderer.render(await this.htmlFor(report));
    await this.auditAction(report, actor, "REPORT_DOWNLOADED");
    return { report, pdf, filename: `${this.baseFilename(report)}.pdf` };
  }

  async renderHtml(id: string, actor: Actor) {
    const report = await this.findById(id, actor);
    this.ensureCompleted(report);
    const html = await this.htmlFor(report);
    await this.auditAction(report, actor, "REPORT_VIEWED");
    return html;
  }

  async renderJson(id: string, actor: Actor) {
    const report = await this.findById(id, actor);
    this.ensureCompleted(report);
    const contents = report.jsonPath ? await this.readStored(report.jsonPath, "Report JSON file is missing.") : Buffer.from(exportReportJson(this.rebuildData(report)));
    await this.auditAction(report, actor, "REPORT_EXPORTED_JSON");
    return { contents, filename: `${this.baseFilename(report)}.json` };
  }

  async renderCsv(id: string, actor: Actor) {
    const report = await this.findById(id, actor);
    this.ensureCompleted(report);
    const contents = report.csvPath ? await this.readStored(report.csvPath, "Report CSV file is missing.") : Buffer.from(exportFindingsCsv(this.rebuildData(report)));
    await this.auditAction(report, actor, "REPORT_EXPORTED_CSV");
    return { contents, filename: `${this.baseFilename(report)}-findings.csv` };
  }

  async delete(id: string, actor: Actor) {
    const report = await this.findById(id, actor);
    await this.storage().deleteMany([report.htmlPath, report.pdfPath, report.jsonPath, report.csvPath]);
    await this.reports.delete(report.id);
    await this.auditAction(report, actor, "REPORT_DELETED");
    return { message: "Report deleted successfully." };
  }

  renderHtmlReport(scan: ReportScanRecord, reportType: ReportType) {
    const options = defaultReportOptions(reportType);
    const data = buildReportData(scan as unknown as ReportSourceScan, reportType, scan.creator, options);
    return this.renderHtmlData(data);
  }

  private renderHtmlData(data: ReportData) {
    return renderReportHtml(data, this.value("REPORT_BRAND_NAME", "LuminarIQ SecureScan"), this.value("REPORT_COMPANY_NAME", "LuminarIQ SoftSol Pvt. Ltd."));
  }

  private rebuildData(report: ReportRecord) {
    const options = optionsFromMetadata(report.metadata, report.reportType);
    const data = buildReportData(report.scan as unknown as ReportSourceScan, report.reportType, report.generator, options);
    if (report.metadata && typeof report.metadata === "object" && !Array.isArray(report.metadata)) {
      const metadata = report.metadata as { reportLevel?: "BASIC" | "DETAILED"; planCode?: "PLUS" | "PRO" | "MAX" };
      data.reportMetadata.reportLevel = metadata.reportLevel ?? data.reportMetadata.reportLevel;
      data.reportMetadata.planCode = metadata.planCode ?? data.reportMetadata.planCode;
      if (data.reportMetadata.reportLevel === "BASIC") {
        data.reportMetadata.title = "Basic Security Report";
        data.reportMetadata.upgradeNote = "Upgrade to Pro or Max to unlock detailed remediation steps and developer-ready fix guidance.";
      }
    }
    return data;
  }

  private async htmlFor(report: ReportRecord) {
    if (report.htmlPath) return (await this.readStored(report.htmlPath, "Report HTML file is missing.")).toString("utf8");
    return report.htmlSnapshot ?? this.renderHtmlData(this.rebuildData(report));
  }

  private async readStored(path: string, missingMessage: string) {
    try { return await this.storage().read(path); } catch { throw new NotFoundException(missingMessage); }
  }

  private ensureCompleted(report: ReportRecord) {
    if (report.reportStatus !== "COMPLETED") throw new BadRequestException(report.reportStatus === "FAILED" ? "Report generation failed. Please generate the report again." : "Report generation is still in progress.");
  }

  private storage() {
    const configured = this.value("REPORT_STORAGE_PATH", this.value("REPORT_STORAGE_DIR", "./storage/reports"));
    return new ReportStorage(resolve(process.cwd(), configured));
  }

  private enabled() { return this.value("REPORTS_ENABLED", "true").toLowerCase() !== "false"; }
  private maxFindings() { return Math.max(1, Number(this.value("REPORT_MAX_FINDINGS", "500")) || 500); }
  private value(name: string, fallback: string) { return this.config?.get<string>(name) ?? process.env[name] ?? fallback; }
  private baseFilename(report: ReportRecord) { return `luminar-securescan-${String(report.reportType).toLowerCase()}-${safeFilename(report.scan.asset.name)}`; }

  private auditAction(report: ReportRecord, actor: Actor, action: string) {
    return this.audit(report.organizationId, actorIdentity(actor).id, action, report.id, undefined, { reportType: report.reportType });
  }

  private audit(organizationId: string, userId: string, action: string, reportId: string, data?: ReportData, extra: Record<string, unknown> = {}) {
    if (!this.prisma) return Promise.resolve(null);
    return this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Report",
        entityId: reportId,
        metadata: {
          projectId: data?.project.id,
          assetId: data?.asset.id,
          scanId: data?.scan.id,
          reportId,
          reportType: data?.reportMetadata.reportType,
          timestamp: new Date().toISOString(),
          ...extra,
        },
      },
    });
  }
}

function actorIdentity(actor: Actor) {
  if (typeof actor === "string") return { id: actor, isAdmin: false };
  return { id: actor.id, isAdmin: actor.role === "ADMIN" || actor.role === "PLATFORM_ADMIN" };
}

function mergeOptions(reportType: ReportType, dto: Partial<GenerateReportDto>): ReportOptions {
  return { ...defaultReportOptions(reportType), ...Object.fromEntries(Object.entries(dto).filter(([key, value]) => key !== "reportType" && typeof value === "boolean")) } as ReportOptions;
}

function optionsFromMetadata(metadata: unknown, reportType: ReportType) {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && "options" in metadata) {
    return { ...defaultReportOptions(reportType), ...(metadata as { options: Partial<ReportOptions> }).options };
  }
  return defaultReportOptions(reportType);
}

function scannerSummary(data: ReportData) {
  return {
    scannersUsed: Array.from(new Set([data.scan.scanner, ...data.findings.map((finding) => finding.source)])),
    scanMode: data.scan.scanMode,
    scanStartedAt: data.scan.startedAt,
    scanCompletedAt: data.scan.completedAt,
  };
}

function safeFilename(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "report"; }
