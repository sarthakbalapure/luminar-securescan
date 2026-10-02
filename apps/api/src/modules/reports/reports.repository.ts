import { Injectable } from "@nestjs/common";
import { Prisma, type ReportType } from "@prisma/client";
import { PrismaService } from "../../prisma.service";

const scanForReportInclude = {
  creator: { select: { id: true, name: true, email: true } },
  asset: { include: { project: { include: { organization: true } } } },
  jobs: { orderBy: { createdAt: "asc" as const } },
  findings: {
    include: { evidence: true, recommendations: true },
    orderBy: [{ severity: "asc" as const }, { lastDetectedAt: "desc" as const }],
  },
  reports: true,
};

const reportInclude = {
  generator: { select: { id: true, name: true, email: true } },
  organization: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  asset: { select: { id: true, name: true, url: true } },
  scan: { include: scanForReportInclude },
};

@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForActor(userId: string, isAdmin: boolean) {
    return this.prisma.report.findMany({
      where: isAdmin ? {} : { organization: { isActive: true, members: { some: { userId } } } },
      include: {
        generator: { select: { id: true, name: true, email: true } },
        scan: {
          include: {
            asset: { include: { project: { include: { organization: true } } } },
            _count: { select: { findings: true } },
          },
        },
      },
      orderBy: { generatedAt: "desc" },
    });
  }

  findByIdForActor(id: string, userId: string, isAdmin: boolean) {
    return this.prisma.report.findFirst({
      where: { id, ...(isAdmin ? {} : { organization: { isActive: true, members: { some: { userId } } } }) },
      include: reportInclude,
    });
  }

  reportExists(id: string) {
    return this.prisma.report.count({ where: { id } }).then((count) => count > 0);
  }

  findScanForReportForActor(id: string, userId: string, isAdmin: boolean) {
    return this.prisma.scan.findFirst({
      where: { id, ...(isAdmin ? {} : { asset: { project: { organization: { isActive: true, members: { some: { userId } } } } } }) },
      include: scanForReportInclude,
    });
  }

  findPreviousScan(assetId: string, currentScanCreatedAt: Date) {
    return this.prisma.scan.findFirst({
      where: { assetId, createdAt: { lt: currentScanCreatedAt }, status: "COMPLETED" },
      include: scanForReportInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  upsertGenerating(input: {
    scanId: string;
    organizationId: string;
    projectId: string;
    assetId: string;
    generatedBy: string;
    reportType: ReportType;
    title: string;
    securityScore: number;
    riskRating: string;
    severitySummary: Prisma.InputJsonValue;
    scannerSummary: Prisma.InputJsonValue;
    metadata: Prisma.InputJsonValue;
  }) {
    const common = {
      organizationId: input.organizationId,
      projectId: input.projectId,
      assetId: input.assetId,
      generatedBy: input.generatedBy,
      title: input.title,
      securityScore: input.securityScore,
      riskRating: input.riskRating,
      severitySummary: input.severitySummary,
      scannerSummary: input.scannerSummary,
      reportStatus: "GENERATING" as const,
      generatedAt: new Date(),
      errorMessage: null,
      metadata: input.metadata,
    };
    return this.prisma.report.upsert({
      where: { scanId_reportType: { scanId: input.scanId, reportType: input.reportType } },
      update: common,
      create: { ...common, scanId: input.scanId, reportType: input.reportType },
    });
  }

  complete(id: string, files: { htmlPath: string; pdfPath: string; jsonPath: string; csvPath: string; fileSize: number; htmlSnapshot: string }) {
    return this.prisma.report.update({
      where: { id },
      data: { ...files, fileUrl: `/reports/${id}/download`, reportStatus: "COMPLETED", errorMessage: null },
      include: {
        generator: { select: { id: true, name: true, email: true } },
        scan: { include: { asset: { include: { project: { include: { organization: true } } } }, _count: { select: { findings: true } } } },
      },
    });
  }

  fail(id: string, errorMessage: string) {
    return this.prisma.report.update({ where: { id }, data: { reportStatus: "FAILED", errorMessage } });
  }

  delete(id: string) {
    return this.prisma.report.delete({ where: { id } });
  }
}

export type ReportScanRecord = Prisma.ScanGetPayload<{ include: typeof scanForReportInclude }>;
export type ReportRecord = Prisma.ReportGetPayload<{ include: typeof reportInclude }>;
