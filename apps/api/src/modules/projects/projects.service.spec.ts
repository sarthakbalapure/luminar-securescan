import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationsRepository } from "../organizations/organizations.repository";
import type { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

describe("ProjectsService", () => {
  const projects = {
    findAllForUser: vi.fn(),
    findByIdForUser: vi.fn(),
    create: vi.fn(),
  };
  const organizations = { findByIdForUser: vi.fn() };
  const prisma = { auditLog: { create: vi.fn() } };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists projects for the authenticated user's accessible organization", async () => {
    projects.findAllForUser.mockResolvedValue([{ id: "project-id" }]);
    const service = new ProjectsService(projects as unknown as ProjectsRepository, organizations as unknown as OrganizationsRepository, prisma as never);

    await expect(service.findAll("user-id", "org-id")).resolves.toEqual([{ id: "project-id" }]);

    expect(projects.findAllForUser).toHaveBeenCalledWith("user-id", "org-id");
  });

  it("rejects project creation when the organization is not accessible", async () => {
    organizations.findByIdForUser.mockResolvedValue(null);
    const service = new ProjectsService(projects as unknown as ProjectsRepository, organizations as unknown as OrganizationsRepository, prisma as never);

    await expect(service.create({ organizationId: "foreign-org", name: "Portal" }, "user-id")).rejects.toBeInstanceOf(NotFoundException);
    expect(projects.create).not.toHaveBeenCalled();
  });

  it("creates a project and writes an audit log", async () => {
    organizations.findByIdForUser.mockResolvedValue({ id: "org-id" });
    projects.create.mockResolvedValue({ id: "project-id", organizationId: "org-id", name: "Customer Portal" });
    const service = new ProjectsService(projects as unknown as ProjectsRepository, organizations as unknown as OrganizationsRepository, prisma as never);

    await expect(service.create({ organizationId: "org-id", name: "  Customer Portal  ", description: " SaaS app " }, "user-id")).resolves.toMatchObject({ id: "project-id" });

    expect(projects.create).toHaveBeenCalledWith({ organizationId: "org-id", name: "Customer Portal", description: "SaaS app" });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-id",
        userId: "user-id",
        action: "USER_CREATED_PROJECT",
        entityType: "Project",
        entityId: "project-id",
      }),
    });
  });
});
