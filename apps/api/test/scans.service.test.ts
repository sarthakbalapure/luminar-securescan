import { describe, expect, it } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ScanType, VerificationStatus } from "@prisma/client";
import type { AssetsRepository } from "../src/modules/assets/assets.repository";
import type { ScansRepository } from "../src/modules/scans/scans.repository";
import { ScansService } from "../src/modules/scans/scans.service";

describe("ScansService", () => {
  it("requires explicit authorization before queueing a scan", async () => {
    const service = new ScansService(
      { create: async () => ({ id: "scan-id" }) } as unknown as ScansRepository,
      { findByIdForUser: async () => null } as unknown as AssetsRepository,
      { add: async () => ({ id: "scan-id" }) } as never
    );

    await expect(
      service.create({
        assetId: "00000000-0000-4000-8000-000000000000",
        scanType: ScanType.WEBSITE_BASELINE,
        createdBy: "00000000-0000-4000-8000-000000000000",
        authorizationConfirmed: false
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("queues defensive scans only after asset verification", async () => {
    const created: unknown[] = [];
    const service = new ScansService(
      { create: async (data: unknown) => created.push(data) && { id: "scan-id" } } as unknown as ScansRepository,
      {
        findByIdForUser: async () => ({
          id: "00000000-0000-4000-8000-000000000000",
          verifiedStatus: VerificationStatus.VERIFIED
        })
      } as unknown as AssetsRepository,
      { add: async () => ({ id: "scan-id" }) } as never
    );

    await service.create({
      assetId: "00000000-0000-4000-8000-000000000000",
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: "00000000-0000-4000-8000-000000000000",
      authorizationConfirmed: true,
    });

    expect(created[0]).toMatchObject({ status: "QUEUED", scanType: ScanType.WEBSITE_BASELINE });
  });
});
