import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ScanJobStatus, ScanStatus } from "@prisma/client";
import { PrismaService } from "../../prisma.service";
import { SCAN_QUEUE, type ScanQueue } from "../scans/scan-queue";
import type { DisableOrganizationDto } from "./dto";
import type { AssignSubscriptionDto } from "../subscriptions/dto";
import { currentMonthKey } from "../subscriptions/subscription-plans";
import { SubscriptionService } from "../subscriptions/subscription.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SCAN_QUEUE) private readonly scanQueue: ScanQueue,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async summary(adminUserId?: string) {
    if (adminUserId) await this.auditForAdminUser(adminUserId, "ADMIN_DASHBOARD_VIEWED");
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [
      totalOrganizations,
      totalUsers,
      totalAssets,
      totalScans,
      scansToday,
      failedScans,
      criticalFindings,
      reportsGenerated,
      activeSubscriptions,
      newUsersToday,
      recentLogins,
      recentUsers,
      recentScans,
      failedScanRows,
      recentAuditLogs,
      queueCounts,
      zapScansToday,
      zapBaselineScans,
      zapFullScans,
      failedZapScans,
      zapCompletedScans,
      nucleiScansToday,
      nucleiSafeBaselineScans,
      nucleiCveScans,
      nucleiFullScans,
      failedNucleiScans,
      nucleiCompletedScans,
      sqlmapScansToday,
      sqlmapFindings,
      failedSqlmapScans,
      sqlmapCompletedScans,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.user.count(),
      this.prisma.asset.count(),
      this.prisma.scan.count(),
      this.prisma.scan.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.scan.count({ where: { status: ScanStatus.FAILED } }),
      this.prisma.finding.count({ where: { severity: "CRITICAL" } }),
      this.prisma.report.count(),
      this.prisma.subscriptionPlan.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
      this.recentLogins(8),
      this.prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.scan.findMany({
        select: {
          id: true,
          status: true,
          scanType: true,
          createdAt: true,
          asset: { select: { name: true, url: true } },
          creator: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.scan.findMany({
        where: { status: ScanStatus.FAILED },
        select: {
          id: true,
          createdAt: true,
          asset: { select: { name: true, url: true } },
          jobs: { where: { status: ScanJobStatus.FAILED }, select: { errorMessage: true }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.prisma.auditLog.findMany({
        select: {
          id: true,
          action: true,
          entityType: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      this.queueCounts(),
      this.prisma.scan.count({ where: { scanner: "owasp_zap", createdAt: { gte: startOfDay } } as never }),
      this.prisma.scan.count({ where: { scanner: "owasp_zap", scanMode: "zap_baseline" } as never }),
      this.prisma.scan.count({ where: { scanner: "owasp_zap", scanMode: "zap_full" } as never }),
      this.prisma.scan.count({ where: { scanner: "owasp_zap", status: ScanStatus.FAILED } as never }),
      this.prisma.scan.findMany({
        where: { scanner: "owasp_zap", completedAt: { not: null }, startedAt: { not: null } } as never,
        select: { startedAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: "desc" },
      }),
      this.prisma.scan.count({ where: { scanner: "nuclei", createdAt: { gte: startOfDay } } as never }),
      this.prisma.scan.count({ where: { scanner: "nuclei", scanMode: "nuclei_safe_baseline" } as never }),
      this.prisma.scan.count({ where: { scanner: "nuclei", scanMode: "nuclei_cve" } as never }),
      this.prisma.scan.count({ where: { scanner: "nuclei", scanMode: "nuclei_full" } as never }),
      this.prisma.scan.count({ where: { scanner: "nuclei", status: ScanStatus.FAILED } as never }),
      this.prisma.scan.findMany({
        where: { scanner: "nuclei", completedAt: { not: null }, startedAt: { not: null } } as never,
        select: { startedAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: "desc" },
      }),
      this.prisma.scan.count({ where: { scanner: "sqlmap", createdAt: { gte: startOfDay } } as never }),
      this.prisma.finding.count({ where: { source: "sqlmap" } as never }),
      this.prisma.scan.count({ where: { scanner: "sqlmap", status: ScanStatus.FAILED } as never }),
      this.prisma.scan.findMany({
        where: { scanner: "sqlmap", completedAt: { not: null }, startedAt: { not: null } } as never,
        select: { startedAt: true, completedAt: true },
        take: 100,
        orderBy: { completedAt: "desc" },
      }),
    ]);
    const zapDurations = zapCompletedScans
      .map((scan) => scan.startedAt && scan.completedAt ? scan.completedAt.getTime() - scan.startedAt.getTime() : 0)
      .filter((duration) => duration > 0);
    const nucleiDurations = nucleiCompletedScans
      .map((scan) => scan.startedAt && scan.completedAt ? scan.completedAt.getTime() - scan.startedAt.getTime() : 0)
      .filter((duration) => duration > 0);
    const sqlmapDurations = sqlmapCompletedScans
      .map((scan) => scan.startedAt && scan.completedAt ? scan.completedAt.getTime() - scan.startedAt.getTime() : 0)
      .filter((duration) => duration > 0);
    const [reportsToday, failedReportGenerations, reportsByType, mostReportedAssets] = await Promise.all([
      this.prisma.report.count({ where: { generatedAt: { gte: startOfDay }, reportStatus: "COMPLETED" } }),
      this.prisma.report.count({ where: { reportStatus: "FAILED" } }),
      this.prisma.report.groupBy({ by: ["reportType"], _count: { _all: true }, orderBy: { _count: { reportType: "desc" } } }),
      this.prisma.report.groupBy({ by: ["assetId"], _count: { _all: true }, orderBy: { _count: { assetId: "desc" } }, take: 5 }),
    ]);
    const reportedAssets = await this.prisma.asset.findMany({
      where: { id: { in: mostReportedAssets.map((row) => row.assetId) } },
      select: { id: true, name: true, url: true },
    });

    const [planCounts, totalScansThisMonth, fixRequestsOpen, fixRequestsResolved, usageRows] = await Promise.all([
      this.prisma.subscriptionPlan.groupBy({
        by: ["planCode"],
        where: { isActive: true, status: "ACTIVE" },
        _count: { _all: true },
      }),
      this.prisma.subscriptionUsage.aggregate({ where: { monthKey: currentMonthKey() }, _sum: { scansUsed: true } }),
      this.prisma.fixSupportRequest.count({ where: { status: { in: ["OPEN", "IN_REVIEW", "WAITING_FOR_CUSTOMER"] } } }),
      this.prisma.fixSupportRequest.count({ where: { status: { in: ["RESOLVED", "CLOSED"] } } }),
      this.prisma.subscriptionUsage.findMany({
        where: { monthKey: currentMonthKey() },
        include: { organization: { select: { id: true, name: true, subscriptionPlans: { where: { isActive: true }, take: 1 } } } },
      }),
    ]);
    const planCount = Object.fromEntries(planCounts.map((row) => [row.planCode, row._count._all]));
    const organizationsNearScanLimit = usageRows.filter((row) => {
      const limit = row.organization.subscriptionPlans[0]?.monthlyScanLimit ?? 0;
      return limit > 0 && row.scansUsed / limit >= 0.8;
    }).length;

    return {
      totalOrganizations,
      totalUsers,
      totalAssets,
      totalScans,
      scansToday,
      failedScans,
      criticalFindingsDetected: criticalFindings,
      reportsGenerated,
      reportsGeneratedToday: reportsToday,
      failedReportGenerations,
      reportsByType: reportsByType.map((row) => ({ reportType: row.reportType, count: row._count._all })),
      mostReportedAssets: mostReportedAssets.map((row) => ({
        ...reportedAssets.find((asset) => asset.id === row.assetId),
        count: row._count._all,
      })),
      activeSubscriptions,
      plusCustomers: planCount.PLUS ?? 0,
      proCustomers: planCount.PRO ?? 0,
      maxCustomers: planCount.MAX ?? 0,
      totalScansThisMonth: totalScansThisMonth._sum.scansUsed ?? 0,
      fixRequestsOpen,
      fixRequestsResolved,
      organizationsNearScanLimit,
      newUsersToday,
      recentLogins,
      recentUsers,
      recentScans,
      failedScanRows,
      recentAuditLogs,
      workerQueueDepth: queueCounts.waiting + queueCounts.delayed,
      queue: queueCounts,
      zapScansToday,
      zapBaselineScans,
      zapFullScans,
      failedZapScans,
      averageZapScanDurationSeconds: zapDurations.length ? Math.round(zapDurations.reduce((total, value) => total + value, 0) / zapDurations.length / 1000) : 0,
      nucleiScansToday,
      nucleiSafeBaselineScans,
      nucleiCveScans,
      nucleiFullScans,
      failedNucleiScans,
      averageNucleiScanDurationSeconds: nucleiDurations.length ? Math.round(nucleiDurations.reduce((total, value) => total + value, 0) / nucleiDurations.length / 1000) : 0,
      sqlmapScansToday,
      sqlmapFindings,
      failedSqlmapScans,
      averageSqlmapScanDurationSeconds: sqlmapDurations.length ? Math.round(sqlmapDurations.reduce((total, value) => total + value, 0) / sqlmapDurations.length / 1000) : 0,
    };
  }

  async organizations(adminUserId?: string) {
    if (adminUserId) await this.auditForAdminUser(adminUserId, "ADMIN_VIEWED_ORGANIZATIONS");
    return this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        ownerId: true,
        isActive: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        subscriptionPlans: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { members: true, projects: true, auditLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async organizationDetail(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, role: true, isActive: true } } }, orderBy: { createdAt: "asc" } },
        projects: { include: { assets: { select: { id: true, type: true, name: true, url: true, riskLevel: true, verifiedStatus: true } } }, orderBy: { createdAt: "desc" } },
        subscriptionPlans: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!organization) throw new NotFoundException("Organization not found.");
    return organization;
  }

  async users(adminUserId?: string) {
    if (adminUserId) await this.auditForAdminUser(adminUserId, "ADMIN_VIEWED_USERS");
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        auditLogs: {
          where: { action: "USER_LOGIN" },
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        organizationMembers: { select: { role: true, organization: { select: { id: true, name: true, slug: true } } } },
        _count: { select: { createdScans: true, auditLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    const newUserCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return users.map(({ auditLogs, ...user }) => ({
      ...user,
      lastLoginAt: auditLogs[0]?.createdAt ?? null,
      isNewUser: user.createdAt >= newUserCutoff,
    }));
  }

  async userDetail(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        auditLogs: {
          where: { action: { in: ["USER_REGISTERED", "USER_LOGIN", "USER_LOGOUT"] } },
          select: { id: true, action: true, createdAt: true, organization: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        organizationMembers: { select: { role: true, organization: { select: { id: true, name: true, slug: true } } } },
        createdScans: {
          select: { id: true, scanType: true, status: true, createdAt: true, asset: { select: { name: true, url: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
    if (!user) throw new NotFoundException("User not found.");
    return {
      ...user,
      lastLoginAt: user.auditLogs.find((log) => log.action === "USER_LOGIN")?.createdAt ?? null,
      registeredAt: user.auditLogs.find((log) => log.action === "USER_REGISTERED")?.createdAt ?? user.createdAt,
    };
  }

  async scans(adminUserId?: string) {
    if (adminUserId) await this.auditForAdminUser(adminUserId, "ADMIN_VIEWED_SCANS");
    return this.prisma.scan.findMany({
      include: {
        asset: { select: { id: true, name: true, url: true, project: { select: { organization: { select: { id: true, name: true, slug: true } } } } } },
        creator: { select: { id: true, name: true, email: true } },
        jobs: { orderBy: { createdAt: "asc" } },
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  findings() {
    return this.prisma.finding.findMany({
      select: {
        id: true,
        title: true,
        severity: true,
        status: true,
        category: true,
        evidenceSummary: true,
        lastDetectedAt: true,
        asset: { select: { id: true, name: true, url: true, project: { select: { organization: { select: { id: true, name: true } } } } } },
        scan: { select: { id: true, scanType: true, status: true } },
      },
      orderBy: [{ severity: "asc" }, { lastDetectedAt: "desc" }],
      take: 100,
    });
  }

  reports() {
    return this.prisma.report.findMany({
      select: {
        id: true,
        title: true,
        reportType: true,
        reportStatus: true,
        riskRating: true,
        fileUrl: true,
        generatedAt: true,
        generator: { select: { id: true, name: true, email: true } },
        scan: {
          select: {
            id: true,
            status: true,
            asset: {
              select: {
                name: true,
                url: true,
                project: { select: { organization: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { generatedAt: "desc" },
      take: 100,
    });
  }

  async auditLogs(adminUserId?: string) {
    if (adminUserId) await this.auditForAdminUser(adminUserId, "ADMIN_VIEWED_AUDIT_LOGS");
    return this.prisma.auditLog.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  subscriptions() {
    return this.prisma.subscriptionPlan.findMany({
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            subscriptionUsages: { where: { monthKey: currentMonthKey() }, take: 1 },
          },
        },
        assigner: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async systemHealth() {
    const [queue, database] = await Promise.all([
      this.queueCounts().then((counts) => ({ status: "OK", ...counts })).catch((error) => ({ status: "ERROR", error: this.safeError(error) })),
      this.prisma.$queryRaw`SELECT 1`.then(() => ({ status: "OK" })).catch((error) => ({ status: "ERROR", error: this.safeError(error) })),
    ]);

    const failedJobs = await this.prisma.scanJob.count({ where: { status: ScanJobStatus.FAILED } });
    const runningScans = await this.prisma.scan.count({ where: { status: ScanStatus.RUNNING } });

    return {
      api: { status: "OK" },
      database,
      queue,
      worker: {
        status: queue.status === "OK" ? "OBSERVABLE" : "UNKNOWN",
        runningScans,
        failedJobs,
      },
      checkedAt: new Date().toISOString(),
    };
  }

  async disableOrganization(id: string, dto: DisableOrganizationDto, adminUserId: string) {
    const organization = await this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, name: true, slug: true, isActive: true },
    }).catch(() => null);
    if (!organization) throw new NotFoundException("Organization not found.");
    await this.audit(id, adminUserId, "ADMIN_ORGANIZATION_DISABLED", "Organization", id, { reason: dto.reason ?? null });
    return organization;
  }

  changeSubscription(organizationId: string, dto: AssignSubscriptionDto, adminUserId: string) {
    return this.subscriptionService.assignPlanToOrganization(organizationId, dto.planCode, adminUserId, dto);
  }

  resetSubscriptionUsage(organizationId: string, adminUserId: string) {
    return this.subscriptionService.resetCurrentMonthUsage(organizationId, adminUserId);
  }

  async retryFailedScan(scanId: string, adminUserId: string) {
    const scan = await this.prisma.scan.findUnique({
      where: { id: scanId },
      include: { asset: { select: { project: { select: { organizationId: true } } } }, jobs: true },
    });
    if (!scan) throw new NotFoundException("Scan not found.");

    await this.prisma.scanJob.updateMany({
      where: { scanId, status: ScanJobStatus.FAILED },
      data: { status: ScanJobStatus.QUEUED, errorMessage: null, startedAt: null, completedAt: null },
    });
    const updated = await this.prisma.scan.update({
      where: { id: scanId },
      data: { status: ScanStatus.QUEUED, completedAt: null },
      include: { jobs: true, asset: { select: { id: true, name: true, url: true } } },
    });
    await this.scanQueue.add("website-scan", { scanId }, { jobId: `${scanId}-admin-retry-${Date.now()}` });
    await this.audit(scan.asset.project.organizationId, adminUserId, "ADMIN_SCAN_RETRIED", "Scan", scanId, {
      failedJobCount: scan.jobs.filter((job) => job.status === ScanJobStatus.FAILED).length,
    });
    return updated;
  }

  async usageReport() {
    const organizations = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        subscriptionPlans: { where: { isActive: true }, take: 1, orderBy: { createdAt: "desc" } },
        projects: {
          select: {
            assets: {
              select: {
                id: true,
                scans: { select: { id: true, status: true } },
                findings: { select: { id: true, severity: true, status: true } },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return {
      generatedAt: new Date().toISOString(),
      organizations: organizations.map((organization) => {
        const assets = organization.projects.flatMap((project) => project.assets);
        const scans = assets.flatMap((asset) => asset.scans);
        const findings = assets.flatMap((asset) => asset.findings);
        return {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          isActive: organization.isActive,
          planName: organization.subscriptionPlans[0]?.planName ?? "UNASSIGNED",
          assetCount: assets.length,
          scanCount: scans.length,
          failedScanCount: scans.filter((scan) => scan.status === ScanStatus.FAILED).length,
          criticalFindingCount: findings.filter((finding) => finding.severity === "CRITICAL").length,
          openFindingCount: findings.filter((finding) => finding.status === "OPEN").length,
        };
      }),
    };
  }

  private async queueCounts() {
    const counts = await this.scanQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused");
    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      paused: counts.paused ?? 0,
    };
  }

  private async recentLogins(take: number) {
    const logs = await this.prisma.auditLog.findMany({
      where: { action: "USER_LOGIN", userId: { not: null } },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, role: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return logs.map((log) => ({
      id: log.id,
      loggedInAt: log.createdAt,
      user: log.user,
      organization: log.organization,
    }));
  }

  private audit(organizationId: string, userId: string, action: string, entityType: string, entityId: string, metadata?: object) {
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType, entityId, metadata },
    });
  }

  private async auditForAdminUser(userId: string, action: string, metadata?: object) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    const fallbackOrganization = membership ? null : await this.prisma.organization.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const organizationId = membership?.organizationId ?? fallbackOrganization?.id;
    if (!organizationId) return null;
    return this.audit(organizationId, userId, action, "Admin", userId, metadata);
  }

  private safeError(error: unknown) {
    return error instanceof Error ? error.message : "Unknown error";
  }
}
