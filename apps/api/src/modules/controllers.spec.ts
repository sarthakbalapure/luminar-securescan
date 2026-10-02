import { ReportType, ScanType, FindingStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { AssetsController } from "./assets/assets.controller";
import { AuthController } from "./auth/auth.controller";
import type { AuthenticatedUser } from "./auth/current-user.decorator";
import { FindingsController } from "./findings/findings.controller";
import { OrganizationsController } from "./organizations/organizations.controller";
import { ProjectsController } from "./projects/projects.controller";
import { ReportsController } from "./reports/reports.controller";
import { ScansController } from "./scans/scans.controller";

const user: AuthenticatedUser = { id: "user-id", name: "Ada", email: "ada@example.com", role: "USER" };

describe("API controllers", () => {
  it("AuthController delegates register, login, and me without exposing controller state", async () => {
    const auth = {
      register: vi.fn().mockResolvedValue({ accessToken: "register-token" }),
      login: vi.fn().mockResolvedValue({ accessToken: "login-token" }),
      me: vi.fn().mockResolvedValue({ id: user.id, email: user.email }),
    };
    const controller = new AuthController(auth as never);

    await expect(controller.register({ name: "Ada Lovelace", organizationName: "Ada Labs", email: "ADA@EXAMPLE.COM", password: "SecurePass!123" })).resolves.toMatchObject({ accessToken: "register-token" });
    await expect(controller.login({ email: "ada@example.com", password: "SecurePass!123" })).resolves.toMatchObject({ accessToken: "login-token" });
    await expect(controller.me(user)).resolves.toMatchObject({ id: user.id });

    expect(auth.register).toHaveBeenCalledWith({ name: "Ada Lovelace", organizationName: "Ada Labs", email: "ADA@EXAMPLE.COM", password: "SecurePass!123" });
    expect(auth.login).toHaveBeenCalledWith({ email: "ada@example.com", password: "SecurePass!123" });
    expect(auth.me).toHaveBeenCalledWith(user.id);
  });

  it("OrganizationsController scopes list, read, and create calls to the authenticated user", async () => {
    const service = {
      findAll: vi.fn().mockResolvedValue([{ id: "org-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "org-id" }),
      create: vi.fn().mockResolvedValue({ id: "org-id" }),
    };
    const controller = new OrganizationsController(service as never);

    await controller.findAll(user);
    await controller.findById("org-id", user);
    await controller.create({ name: "Luminar Labs", slug: "luminar-labs" }, user);

    expect(service.findAll).toHaveBeenCalledWith(user.id);
    expect(service.findById).toHaveBeenCalledWith("org-id", user.id);
    expect(service.create).toHaveBeenCalledWith({ name: "Luminar Labs", slug: "luminar-labs" }, user.id);
  });

  it("ProjectsController scopes project queries and creation to the authenticated user", async () => {
    const service = {
      findAll: vi.fn().mockResolvedValue([{ id: "project-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "project-id" }),
      create: vi.fn().mockResolvedValue({ id: "project-id" }),
    };
    const controller = new ProjectsController(service as never);

    await controller.findAll({ organizationId: "org-id" }, user);
    await controller.findById("project-id", user);
    await controller.create({ organizationId: "org-id", name: "Customer Portal", description: "SaaS app" }, user);

    expect(service.findAll).toHaveBeenCalledWith(user.id, "org-id");
    expect(service.findById).toHaveBeenCalledWith("project-id", user.id);
    expect(service.create).toHaveBeenCalledWith({ organizationId: "org-id", name: "Customer Portal", description: "SaaS app" }, user.id);
  });

  it("AssetsController scopes asset queries and creation to the authenticated user", async () => {
    const service = {
      findAll: vi.fn().mockResolvedValue([{ id: "asset-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "asset-id" }),
      create: vi.fn().mockResolvedValue({ id: "asset-id" }),
    };
    const controller = new AssetsController(service as never);
    const dto = {
      projectId: "project-id",
      type: "WEBSITE",
      name: "Demo Site",
      url: "https://demo.luminar.example",
      verifiedStatus: "VERIFIED",
      riskLevel: "LOW",
    } as never;

    await controller.findAll({ projectId: "project-id" }, user);
    await controller.findById("asset-id", user);
    await controller.create(dto, user);

    expect(service.findAll).toHaveBeenCalledWith(user.id, "project-id");
    expect(service.findById).toHaveBeenCalledWith("asset-id", user.id);
    expect(service.create).toHaveBeenCalledWith(dto, user.id);
  });

  it("ScansController requires user context when listing, reading, and creating scans", async () => {
    const service = {
      findAll: vi.fn().mockResolvedValue([{ id: "scan-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "scan-id" }),
      create: vi.fn().mockResolvedValue({ id: "scan-id" }),
    };
    const zap = { checkZapHealth: vi.fn().mockResolvedValue({ healthy: true }) };
    const nuclei = { checkNucleiAvailability: vi.fn().mockResolvedValue({ healthy: true }) };
    const sqlmap = { checkSqlmapAvailability: vi.fn().mockResolvedValue({ healthy: true }) };
    const controller = new ScansController(service as never, zap as never, nuclei as never, sqlmap as never);
    const dto = { assetId: "asset-id", scanType: ScanType.WEBSITE_BASELINE, authorizationConfirmed: true };

    await controller.findAll({ assetId: "asset-id" }, user);
    await controller.findById("scan-id", user);
    await controller.create(dto as never, user);

    expect(service.findAll).toHaveBeenCalledWith(user.id, "asset-id");
    expect(service.findById).toHaveBeenCalledWith("scan-id", user.id);
    expect(service.create).toHaveBeenCalledWith(dto, user.id);
  });

  it("FindingsController scopes reads and status updates to the authenticated user", async () => {
    const service = {
      findAll: vi.fn().mockResolvedValue([{ id: "finding-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "finding-id" }),
      updateStatus: vi.fn().mockResolvedValue({ id: "finding-id", status: FindingStatus.RISK_ACCEPTED }),
    };
    const controller = new FindingsController(service as never);

    await controller.findAll({ scanId: "scan-id", assetId: "asset-id" }, user);
    await controller.findById("finding-id", user);
    await controller.updateStatus("finding-id", { status: FindingStatus.RISK_ACCEPTED }, user);

    expect(service.findAll).toHaveBeenCalledWith(user.id, "scan-id", "asset-id");
    expect(service.findById).toHaveBeenCalledWith("finding-id", user.id);
    expect(service.updateStatus).toHaveBeenCalledWith("finding-id", user.id, FindingStatus.RISK_ACCEPTED);
  });

  it("ReportsController generates, lists, reads, and downloads authorized reports", async () => {
    const pdf = Buffer.from("%PDF-1.4 test");
    const service = {
      generateForScan: vi.fn().mockResolvedValue({ id: "report-id" }),
      findAll: vi.fn().mockResolvedValue([{ id: "report-id" }]),
      findById: vi.fn().mockResolvedValue({ id: "report-id" }),
      renderDownload: vi.fn().mockResolvedValue({ pdf, filename: "luminar-report.pdf" }),
    };
    const response = { set: vi.fn() };
    const controller = new ReportsController(service as never);

    await controller.generateForScan("scan-id", { reportType: ReportType.FULL }, user);
    await controller.findAll(user);
    await controller.findById("report-id", user);
    const file = await controller.download("report-id", user, response);

    expect(service.generateForScan).toHaveBeenCalledWith("scan-id", ReportType.FULL, user, { reportType: ReportType.FULL });
    expect(service.findAll).toHaveBeenCalledWith(user);
    expect(service.findById).toHaveBeenCalledWith("report-id", user);
    expect(service.renderDownload).toHaveBeenCalledWith("report-id", user);
    expect(response.set).toHaveBeenCalledWith({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="luminar-report.pdf"',
      "Content-Length": pdf.length,
    });
    expect(file).toBeTruthy();
  });
});
