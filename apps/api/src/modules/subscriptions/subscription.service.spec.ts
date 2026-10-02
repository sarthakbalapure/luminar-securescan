import { HttpException } from "@nestjs/common";
import { PlanCode, ReportLevel, SubscriptionStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../prisma.service";
import { SUBSCRIPTION_PLANS, currentMonthKey } from "./subscription-plans";
import { SubscriptionService } from "./subscription.service";

const activePlus = {
  id: "subscription-id",
  organizationId: "organization-id",
  planCode: PlanCode.PLUS,
  planName: "Plus",
  status: SubscriptionStatus.ACTIVE,
  monthlyScanLimit: 3,
  monthlyFixRequestLimit: 0,
  dailyScanEnabled: false,
  reportLevel: ReportLevel.BASIC,
};

describe("SubscriptionService", () => {
  it("defines the documented Plus, Pro, and Max limits", () => {
    expect(SUBSCRIPTION_PLANS.PLUS).toMatchObject({ monthlyScanLimit: 3, reportLevel: ReportLevel.BASIC, monthlyFixRequestLimit: 0 });
    expect(SUBSCRIPTION_PLANS.PRO).toMatchObject({ monthlyScanLimit: 10, reportLevel: ReportLevel.DETAILED, monthlyFixRequestLimit: 0 });
    expect(SUBSCRIPTION_PLANS.MAX).toMatchObject({ monthlyScanLimit: 30, dailyScanEnabled: true, monthlyFixRequestLimit: 10 });
  });

  it("uses a stable UTC month key for monthly usage records", () => {
    expect(currentMonthKey(new Date("2026-09-30T23:59:59.000Z"))).toBe("2026-09");
  });

  it("assigns Plus by default to a new organization", async () => {
    const prisma = {
      subscriptionPlan: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(activePlus),
      },
    };
    const service = new SubscriptionService(prisma as unknown as PrismaService);

    await service.ensureDefaultSubscription("organization-id", "owner-id");

    expect(prisma.subscriptionPlan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "organization-id",
        planCode: PlanCode.PLUS,
        monthlyScanLimit: 3,
        reportLevel: ReportLevel.BASIC,
        assignedBy: "owner-id",
      }),
    });
  });

  it("blocks scans after the monthly plan limit is reached", async () => {
    const prisma = {
      subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(activePlus) },
      subscriptionUsage: { upsert: vi.fn().mockResolvedValue({ id: "usage-id", scansUsed: 3, fixRequestsUsed: 0 }) },
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-id" }) },
    };
    const service = new SubscriptionService(prisma as unknown as PrismaService);

    await expect(service.assertCanRunScan("organization-id")).rejects.toBeInstanceOf(HttpException);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SUBSCRIPTION_SCAN_LIMIT_REACHED" }) }));
  });

  it("lets an admin assign Max with canonical backend limits", async () => {
    const transactionClient = {
      subscriptionPlan: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockImplementation(({ data }) => ({ id: "max-subscription", ...data })),
      },
    };
    const prisma = {
      organization: { findUnique: vi.fn().mockResolvedValue({ id: "organization-id" }) },
      subscriptionPlan: { findFirst: vi.fn().mockResolvedValue(activePlus) },
      $transaction: vi.fn().mockImplementation((callback) => callback(transactionClient)),
      auditLog: { create: vi.fn().mockResolvedValue({ id: "audit-id" }) },
    };
    const service = new SubscriptionService(prisma as unknown as PrismaService);

    const assigned = await service.assignPlanToOrganization("organization-id", PlanCode.MAX, "admin-id", { planCode: PlanCode.MAX });

    expect(assigned).toMatchObject({ planCode: PlanCode.MAX, monthlyScanLimit: 30, monthlyFixRequestLimit: 10, dailyScanEnabled: true });
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "SUBSCRIPTION_PLAN_CHANGED", userId: "admin-id" }) }));
  });
});
