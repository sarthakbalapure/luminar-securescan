import { ForbiddenException } from "@nestjs/common";
import { PlanCode } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "../auth/current-user.decorator";
import { AdminController } from "./admin.controller";
import { PlatformAdminGuard } from "./platform-admin.guard";

const adminUser: AuthenticatedUser = { id: "admin-id", name: "Admin", email: "admin@example.com", role: "ADMIN" };

describe("AdminController", () => {
  it("delegates platform admin overview and management actions", async () => {
    const service = {
      summary: vi.fn().mockResolvedValue({ totalOrganizations: 1 }),
      organizations: vi.fn().mockResolvedValue([]),
      organizationDetail: vi.fn().mockResolvedValue({ id: "org-id" }),
      disableOrganization: vi.fn().mockResolvedValue({ id: "org-id", isActive: false }),
      users: vi.fn().mockResolvedValue([]),
      userDetail: vi.fn().mockResolvedValue({ id: "user-id" }),
      scans: vi.fn().mockResolvedValue([]),
      retryFailedScan: vi.fn().mockResolvedValue({ id: "scan-id" }),
      findings: vi.fn().mockResolvedValue([]),
      reports: vi.fn().mockResolvedValue([]),
      auditLogs: vi.fn().mockResolvedValue([]),
      systemHealth: vi.fn().mockResolvedValue({ api: { status: "OK" } }),
      subscriptions: vi.fn().mockResolvedValue([]),
      changeSubscription: vi.fn().mockResolvedValue({ id: "plan-id" }),
      usageReport: vi.fn().mockResolvedValue({ organizations: [] }),
    };
    const controller = new AdminController(service as never);

    await controller.summary(adminUser);
    await controller.organizations(adminUser);
    await controller.organizationDetail("org-id");
    await controller.disableOrganization("org-id", { reason: "test" }, adminUser);
    await controller.users(adminUser);
    await controller.userDetail("user-id");
    await controller.scans(adminUser);
    await controller.retryFailedScan("scan-id", adminUser);
    await controller.findings();
    await controller.reports();
    await controller.auditLogs(adminUser);
    await controller.systemHealth();
    await controller.subscriptions();
    await controller.changeSubscription("org-id", { planCode: PlanCode.PRO }, adminUser);
    await controller.usageReport();

    expect(service.disableOrganization).toHaveBeenCalledWith("org-id", { reason: "test" }, "admin-id");
    expect(service.retryFailedScan).toHaveBeenCalledWith("scan-id", "admin-id");
    expect(service.changeSubscription).toHaveBeenCalledWith("org-id", { planCode: PlanCode.PRO }, "admin-id");
  });
});

describe("PlatformAdminGuard", () => {
  it("allows platform administrators", () => {
    const guard = new PlatformAdminGuard();
    expect(guard.canActivate(contextFor(adminUser))).toBe(true);
  });

  it("allows ADMIN role aliases for backward compatibility", () => {
    const guard = new PlatformAdminGuard();
    expect(guard.canActivate(contextFor({ ...adminUser, role: "ADMIN" }))).toBe(true);
  });

  it("rejects non-admin users", () => {
    const guard = new PlatformAdminGuard();
    expect(() => guard.canActivate(contextFor({ ...adminUser, role: "USER" }))).toThrow(ForbiddenException);
  });
});

function contextFor(user?: AuthenticatedUser) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}
