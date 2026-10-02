import { BadRequestException, NotFoundException } from "@nestjs/common";
import { AssetType, RiskLevel, VerificationStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectsRepository } from "../projects/projects.repository";
import type { AssetsRepository } from "./assets.repository";
import { AssetsService } from "./assets.service";

describe("AssetsService", () => {
  const assets = {
    findAllForUser: vi.fn(),
    findById: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
  };
  const projects = { findByIdForUser: vi.fn() };
  const prisma = {
    apiSpecification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    projects.findByIdForUser.mockResolvedValue({ id: "project-id", organizationId: "org-id" });
    assets.create.mockResolvedValue({ id: "asset-id", name: "Demo Website", url: "https://demo.luminar.example", type: AssetType.WEBSITE });
    assets.findById.mockResolvedValue({ id: "asset-id", name: "Demo Website" });
  });

  it("rejects asset creation when the project is not accessible", async () => {
    projects.findByIdForUser.mockResolvedValue(null);
    const service = new AssetsService(assets as unknown as AssetsRepository, projects as unknown as ProjectsRepository, prisma as never);

    await expect(service.create({
      projectId: "foreign-project",
      type: AssetType.WEBSITE,
      name: "Demo",
      url: "https://demo.luminar.example",
      verifiedStatus: VerificationStatus.UNVERIFIED,
      riskLevel: RiskLevel.INFO,
    }, "user-id")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("creates a website asset and writes an audit log", async () => {
    const service = new AssetsService(assets as unknown as AssetsRepository, projects as unknown as ProjectsRepository, prisma as never);

    await expect(service.create({
      projectId: "project-id",
      type: AssetType.WEBSITE,
      name: "  Demo Website  ",
      url: "https://demo.luminar.example",
      verifiedStatus: VerificationStatus.VERIFIED,
      riskLevel: RiskLevel.LOW,
    }, "user-id")).resolves.toMatchObject({ id: "asset-id" });

    expect(assets.create).toHaveBeenCalledWith(expect.objectContaining({ name: "Demo Website" }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-id",
        userId: "user-id",
        action: "USER_ADDED_ASSET",
        entityType: "Asset",
        entityId: "asset-id",
      }),
    });
  });

  it("rejects API assets without an OpenAPI upload or URL", async () => {
    const service = new AssetsService(assets as unknown as AssetsRepository, projects as unknown as ProjectsRepository, prisma as never);

    await expect(service.create({
      projectId: "project-id",
      type: AssetType.API,
      name: "Demo API",
      url: "https://api.luminar.example",
      verifiedStatus: VerificationStatus.UNVERIFIED,
      riskLevel: RiskLevel.INFO,
    }, "user-id")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("stores parsed OpenAPI specifications for API assets", async () => {
    assets.create.mockResolvedValue({ id: "api-asset-id", name: "Demo API", url: "https://api.luminar.example", type: AssetType.API });
    assets.findById.mockResolvedValue({ id: "api-asset-id", apiSpecification: { id: "spec-id" } });
    const service = new AssetsService(assets as unknown as AssetsRepository, projects as unknown as ProjectsRepository, prisma as never);
    const spec = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Demo API", version: "1.0.0" },
      servers: [{ url: "https://api.luminar.example" }],
      paths: { "/users": { get: { responses: { "200": { description: "OK" } } } } },
    });

    await service.create({
      projectId: "project-id",
      type: AssetType.API,
      name: "Demo API",
      url: "https://api.luminar.example",
      verifiedStatus: VerificationStatus.UNVERIFIED,
      riskLevel: RiskLevel.INFO,
      openApiSpecContent: spec,
    }, "user-id");

    expect(prisma.apiSpecification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assetId: "api-asset-id",
        sourceType: "UPLOAD",
        baseUrl: "https://api.luminar.example",
        rawContent: spec,
      }),
    });
  });
});
