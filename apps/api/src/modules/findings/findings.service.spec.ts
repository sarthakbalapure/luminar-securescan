import { NotFoundException } from "@nestjs/common";
import { FindingStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FindingsRepository } from "./findings.repository";
import { FindingsService } from "./findings.service";

describe("FindingsService", () => {
  const repository = {
    findAllForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    updateStatusForUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists findings scoped by scan and asset for a user", async () => {
    repository.findAllForUser.mockResolvedValue([{ id: "finding-id" }]);
    const service = new FindingsService(repository as unknown as FindingsRepository);

    await expect(service.findAll("user-id", "scan-id", "asset-id")).resolves.toEqual([{ id: "finding-id" }]);

    expect(repository.findAllForUser).toHaveBeenCalledWith("user-id", "scan-id", "asset-id");
  });

  it("returns a finding when the user has access", async () => {
    repository.findByIdForUser.mockResolvedValue({ id: "finding-id", status: FindingStatus.OPEN });
    const service = new FindingsService(repository as unknown as FindingsRepository);

    await expect(service.findById("finding-id", "user-id")).resolves.toMatchObject({ id: "finding-id" });
  });

  it("hides inaccessible findings as not found", async () => {
    repository.findByIdForUser.mockResolvedValue(null);
    const service = new FindingsService(repository as unknown as FindingsRepository);

    await expect(service.findById("foreign-finding", "user-id")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates finding status after confirming user access", async () => {
    repository.findByIdForUser.mockResolvedValue({ id: "finding-id", status: FindingStatus.OPEN });
    repository.updateStatusForUser.mockResolvedValue({ id: "finding-id", status: FindingStatus.FALSE_POSITIVE });
    const service = new FindingsService(repository as unknown as FindingsRepository);

    await expect(service.updateStatus("finding-id", "user-id", FindingStatus.FALSE_POSITIVE)).resolves.toMatchObject({
      status: FindingStatus.FALSE_POSITIVE,
    });

    expect(repository.updateStatusForUser).toHaveBeenCalledWith("finding-id", "user-id", FindingStatus.FALSE_POSITIVE);
  });
});
