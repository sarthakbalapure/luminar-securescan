import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { FindingSeverity, FixRequestStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../prisma.service";
import type { SubscriptionService } from "../subscriptions/subscription.service";
import { FixRequestsService } from "./fix-requests.service";

const finding = {
  id: "finding-id",
  scanId: "scan-id",
  assetId: "asset-id",
  severity: FindingSeverity.HIGH,
  asset: { projectId: "project-id", project: { organizationId: "organization-id" } },
};

describe("FixRequestsService", () => {
  it("rejects a finding outside the user's organization", async () => {
    const prisma = { finding: { findFirst: vi.fn().mockResolvedValue(null) } };
    const service = new FixRequestsService(prisma as unknown as PrismaService, {} as SubscriptionService);

    await expect(service.create("user-id", { findingId: "other-finding", subject: "Help needed", message: "Please help me fix this issue." })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not create support requests for Plus or Pro organizations", async () => {
    const prisma = {
      finding: { findFirst: vi.fn().mockResolvedValue(finding) },
      fixSupportRequest: { create: vi.fn() },
    };
    const subscriptions = {
      assertCanCreateFixRequest: vi.fn().mockRejectedValue(new ForbiddenException("Fix support requests are available only in Max plan.")),
    };
    const service = new FixRequestsService(prisma as unknown as PrismaService, subscriptions as unknown as SubscriptionService);

    await expect(service.create("user-id", { findingId: "finding-id", subject: "Help needed", message: "Please help me fix this issue." })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.fixSupportRequest.create).not.toHaveBeenCalled();
  });

  it("creates a Max support request and increments monthly usage", async () => {
    const created = { id: "request-id", organizationId: "organization-id", status: FixRequestStatus.OPEN };
    const prisma = {
      finding: { findFirst: vi.fn().mockResolvedValue(finding) },
      fixSupportRequest: { create: vi.fn().mockResolvedValue(created), delete: vi.fn() },
    };
    const subscriptions = {
      assertCanCreateFixRequest: vi.fn().mockResolvedValue({}),
      incrementFixRequestUsage: vi.fn().mockResolvedValue(undefined),
    };
    const service = new FixRequestsService(prisma as unknown as PrismaService, subscriptions as unknown as SubscriptionService);

    const result = await service.create("user-id", { findingId: "finding-id", subject: " Help needed ", message: " Please help me fix this issue. " });

    expect(result).toBe(created);
    expect(prisma.fixSupportRequest.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organizationId: "organization-id", subject: "Help needed", requestedBy: "user-id" }) }));
    expect(subscriptions.incrementFixRequestUsage).toHaveBeenCalledWith("organization-id", "user-id", "request-id");
  });
});
