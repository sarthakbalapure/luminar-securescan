import { ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { PlanCode, ReportLevel, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma.service";
import type { AssignSubscriptionDto } from "./dto";
import { currentMonthKey, planLimits, SUBSCRIPTION_PLANS } from "./subscription-plans";

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async plans() {
    const plans = await this.prisma.planDefinition.findMany({ where: { isActive: true }, orderBy: { priceMonthly: "asc" } });
    return plans.length ? plans : Object.values(SUBSCRIPTION_PLANS);
  }

  getPlanLimits(planCode: PlanCode) {
    return planLimits(planCode);
  }

  async getOrganizationSubscription(organizationId: string) {
    const now = new Date();
    const subscription = await this.prisma.subscriptionPlan.findFirst({
      where: {
        organizationId,
        isActive: true,
        status: SubscriptionStatus.ACTIVE,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { validFrom: "desc" },
    });
    if (!subscription) throw new NotFoundException("No active subscription found for this organization.");
    return subscription;
  }

  async getCurrentMonthUsage(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    return this.ensureUsage(organizationId, subscription.planCode);
  }

  async overviewForUser(userId: string, requestedOrganizationId?: string) {
    const organizationId = await this.organizationIdForUser(userId, requestedOrganizationId);
    return this.overview(organizationId);
  }

  async overview(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    const limits = planLimits(subscription.planCode);
    const monthlyScanLimit = subscription.monthlyScanLimit;
    const monthlyFixRequestLimit = subscription.monthlyFixRequestLimit;
    return {
      organizationId,
      subscription,
      plan: limits,
      usage,
      scansRemaining: Math.max(0, monthlyScanLimit - usage.scansUsed),
      fixRequestsRemaining: Math.max(0, monthlyFixRequestLimit - usage.fixRequestsUsed),
      scanUsagePercent: monthlyScanLimit ? Math.round((usage.scansUsed / monthlyScanLimit) * 100) : 100,
      detailedReportsEnabled: subscription.reportLevel === ReportLevel.DETAILED,
      dailyScanMessage: subscription.dailyScanEnabled
        ? "Daily scan is available in Max plan. Scheduling configuration will be available soon."
        : "Daily scanning is not available on this plan.",
    };
  }

  async assertCanRunScan(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    if (usage.scansUsed >= subscription.monthlyScanLimit) {
      await this.audit(organizationId, null, "SUBSCRIPTION_SCAN_LIMIT_REACHED", subscription.id, {
        planCode: subscription.planCode,
        scansUsed: usage.scansUsed,
        monthlyScanLimit: subscription.monthlyScanLimit,
      });
      throw new HttpException("Monthly scan limit reached for your current subscription plan.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return { subscription, usage };
  }

  async canRunScan(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    return usage.scansUsed < subscription.monthlyScanLimit;
  }

  async incrementScanUsage(organizationId: string, userId: string, scanId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    const now = new Date();
    const sameUtcDay = usage.lastScanDate
      && usage.lastScanDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    const updated = await this.prisma.subscriptionUsage.updateMany({
      where: { id: usage.id, scansUsed: { lt: subscription.monthlyScanLimit } },
      data: {
        scansUsed: { increment: 1 },
        dailyScanCount: sameUtcDay ? { increment: 1 } : 1,
        lastScanDate: now,
        planCode: subscription.planCode,
      },
    });
    if (!updated.count) {
      await this.audit(organizationId, userId, "SUBSCRIPTION_SCAN_LIMIT_REACHED", subscription.id, { planCode: subscription.planCode, scanId });
      throw new HttpException("Monthly scan limit reached for your current subscription plan.", HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.audit(organizationId, userId, "SUBSCRIPTION_USAGE_SCAN_INCREMENTED", usage.id, { planCode: subscription.planCode, scanId });
  }

  async rollbackScanUsage(organizationId: string) {
    const usage = await this.prisma.subscriptionUsage.findUnique({
      where: { organizationId_monthKey: { organizationId, monthKey: currentMonthKey() } },
    });
    if (!usage || usage.scansUsed <= 0) return;
    await this.prisma.subscriptionUsage.update({ where: { id: usage.id }, data: { scansUsed: { decrement: 1 } } });
  }

  async canGenerateDetailedReport(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    return subscription.reportLevel === ReportLevel.DETAILED;
  }

  async assertCanCreateFixRequest(organizationId: string, userId?: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    if (subscription.planCode !== PlanCode.MAX || subscription.monthlyFixRequestLimit <= 0) {
      throw new ForbiddenException("Fix support requests are available only in Max plan.");
    }
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    if (usage.fixRequestsUsed >= subscription.monthlyFixRequestLimit) {
      await this.audit(organizationId, userId ?? null, "FIX_REQUEST_LIMIT_REACHED", subscription.id, {
        planCode: subscription.planCode,
        fixRequestsUsed: usage.fixRequestsUsed,
      });
      throw new HttpException("You have used all 10 admin support requests for this month.", HttpStatus.TOO_MANY_REQUESTS);
    }
    return { subscription, usage };
  }

  async canCreateFixRequest(organizationId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    if (subscription.planCode !== PlanCode.MAX || subscription.monthlyFixRequestLimit <= 0) return false;
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    return usage.fixRequestsUsed < subscription.monthlyFixRequestLimit;
  }

  async incrementFixRequestUsage(organizationId: string, userId: string, requestId: string) {
    const { subscription, usage } = await this.assertCanCreateFixRequest(organizationId, userId);
    const updated = await this.prisma.subscriptionUsage.updateMany({
      where: { id: usage.id, fixRequestsUsed: { lt: subscription.monthlyFixRequestLimit } },
      data: { fixRequestsUsed: { increment: 1 }, planCode: subscription.planCode },
    });
    if (!updated.count) throw new HttpException("You have used all 10 admin support requests for this month.", HttpStatus.TOO_MANY_REQUESTS);
    await this.audit(organizationId, userId, "FIX_REQUEST_CREATED", requestId, { planCode: subscription.planCode });
  }

  async ensureDefaultSubscription(organizationId: string, assignedBy?: string) {
    const existing = await this.prisma.subscriptionPlan.findFirst({ where: { organizationId, isActive: true } });
    if (existing) return existing;
    return this.createAssignment(organizationId, PlanCode.PLUS, assignedBy, {});
  }

  async assignPlanToOrganization(organizationId: string, planCode: PlanCode, adminUserId: string, options: AssignSubscriptionDto) {
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) throw new NotFoundException("Organization not found.");
    const previous = await this.prisma.subscriptionPlan.findFirst({ where: { organizationId, isActive: true }, orderBy: { createdAt: "desc" } });
    const assignment = await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionPlan.updateMany({
        where: { organizationId, isActive: true },
        data: { isActive: false, status: SubscriptionStatus.INACTIVE },
      });
      const limits = planLimits(planCode);
      return tx.subscriptionPlan.create({
        data: {
          organizationId,
          planCode,
          planName: limits.displayName,
          status: SubscriptionStatus.ACTIVE,
          assignedBy: adminUserId,
          scanLimit: limits.monthlyScanLimit,
          assetLimit: limits.assetLimit,
          monthlyScanLimit: limits.monthlyScanLimit,
          monthlyFixRequestLimit: limits.monthlyFixRequestLimit,
          dailyScanEnabled: limits.dailyScanEnabled,
          reportLevel: limits.reportLevel,
          validFrom: options.validFrom ? new Date(options.validFrom) : new Date(),
          validTo: options.validTo ? new Date(options.validTo) : null,
          notes: options.notes?.trim() || null,
        },
      });
    });
    await this.audit(
      organizationId,
      adminUserId,
      previous ? "SUBSCRIPTION_PLAN_CHANGED" : "SUBSCRIPTION_PLAN_ASSIGNED",
      assignment.id,
      { previousPlanCode: previous?.planCode ?? null, planCode },
    );
    return assignment;
  }

  async resetCurrentMonthUsage(organizationId: string, adminUserId: string) {
    const subscription = await this.getOrganizationSubscription(organizationId);
    const usage = await this.ensureUsage(organizationId, subscription.planCode);
    const reset = await this.prisma.subscriptionUsage.update({
      where: { id: usage.id },
      data: { scansUsed: 0, fixRequestsUsed: 0, dailyScanCount: 0, lastScanDate: null },
    });
    await this.audit(organizationId, adminUserId, "SUBSCRIPTION_USAGE_RESET", usage.id, { monthKey: usage.monthKey, planCode: subscription.planCode });
    return reset;
  }

  private async createAssignment(organizationId: string, planCode: PlanCode, assignedBy: string | undefined, options: { validTo?: Date }) {
    const limits = planLimits(planCode);
    return this.prisma.subscriptionPlan.create({
      data: {
        organizationId,
        planCode,
        planName: limits.displayName,
        scanLimit: limits.monthlyScanLimit,
        assetLimit: limits.assetLimit,
        monthlyScanLimit: limits.monthlyScanLimit,
        monthlyFixRequestLimit: limits.monthlyFixRequestLimit,
        dailyScanEnabled: limits.dailyScanEnabled,
        reportLevel: limits.reportLevel,
        assignedBy,
        validFrom: new Date(),
        validTo: options.validTo,
      },
    });
  }

  private async ensureUsage(organizationId: string, planCode: PlanCode) {
    const monthKey = currentMonthKey();
    return this.prisma.subscriptionUsage.upsert({
      where: { organizationId_monthKey: { organizationId, monthKey } },
      update: { planCode },
      create: { organizationId, planCode, monthKey },
    });
  }

  private async organizationIdForUser(userId: string, requestedOrganizationId?: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId, organization: { isActive: true }, ...(requestedOrganizationId ? { organizationId: requestedOrganizationId } : {}) },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    if (!membership) throw new ForbiddenException("You do not have access to this organization.");
    return membership.organizationId;
  }

  private audit(organizationId: string, userId: string | null, action: string, entityId: string, metadata?: object) {
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType: "Subscription", entityId, metadata },
    });
  }
}
