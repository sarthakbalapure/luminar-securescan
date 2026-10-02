import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { SubscriptionService } from "../subscriptions/subscription.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async summary(userId: string) {
    const organization = await this.prisma.organizationMember.findFirst({
      where: { userId, organization: { isActive: true } },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });

    if (organization) {
      await this.prisma.auditLog.create({
        data: {
          organizationId: organization.organizationId,
          userId,
          action: "USER_DASHBOARD_VIEWED",
          entityType: "Dashboard",
          entityId: userId,
        },
      });
    }

    const ownership = { project: { organization: { isActive: true, members: { some: { userId } } } } };
    const scanOwnership = { asset: ownership };
    const findingOwnership = { asset: ownership };
    const reportOwnership = { scan: scanOwnership };

    const [assetCount, scans, criticalFindings, highFindings, reportsGenerated, latestReport] = await Promise.all([
      this.prisma.asset.count({ where: ownership }),
      this.prisma.scan.findMany({
        where: scanOwnership,
        select: { id: true, status: true, securityScore: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.finding.count({ where: { ...findingOwnership, severity: "CRITICAL", status: { notIn: ["FIXED", "FALSE_POSITIVE"] } } }),
      this.prisma.finding.count({ where: { ...findingOwnership, severity: "HIGH", status: { notIn: ["FIXED", "FALSE_POSITIVE"] } } }),
      this.prisma.report.count({ where: reportOwnership }),
      this.prisma.report.findFirst({
        where: reportOwnership,
        select: { id: true, title: true, reportType: true, generatedAt: true, reportStatus: true },
        orderBy: { generatedAt: "desc" },
      }),
    ]);

    const latestScan = scans[0] ?? null;
    const subscription = organization ? await this.subscriptions.overview(organization.organizationId) : null;
    return {
      securityScore: latestScan?.securityScore ?? null,
      totalAssets: assetCount,
      totalScans: scans.length,
      criticalFindings,
      highFindings,
      latestScanStatus: latestScan?.status ?? null,
      reportsGenerated,
      latestReport,
      lastReportDate: latestReport?.generatedAt ?? null,
      subscription,
    };
  }
}
