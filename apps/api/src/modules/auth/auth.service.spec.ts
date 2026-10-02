import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../../prisma.service";
import { AuthService } from "./auth.service";

function createService(overrides: Partial<PrismaService> = {}) {
  const prisma = {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "user-id-12345678", name: "Ada", email: "ada@example.com", role: "USER" }),
    },
    organization: {
      create: vi.fn().mockResolvedValue({ id: "organization-id" }),
      findFirst: vi.fn().mockResolvedValue({ id: "organization-id" }),
    },
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue({ organizationId: "organization-id" }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-id" }),
    },
    ...overrides,
  } as unknown as PrismaService;
  const jwt = { sign: vi.fn().mockReturnValue("signed-token") } as unknown as JwtService;
  return { service: new AuthService(jwt, prisma), prisma, jwt };
}

describe("AuthService", () => {
  it("registers users with a hashed password and hides the hash", async () => {
    const { service, prisma } = createService();
    const result = await service.register({ name: "Ada", organizationName: "Ada Labs", email: "ADA@example.com", password: "VeryStrong!123" });

    const data = vi.mocked(prisma.user.create).mock.calls[0]?.[0].data;
    expect(data.email).toBe("ada@example.com");
    expect(await bcrypt.compare("VeryStrong!123", data.passwordHash)).toBe(true);
    expect(result.accessToken).toBe("signed-token");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "USER_REGISTERED" }) })
    );
  });

  it("rejects duplicate registration emails", async () => {
    const { service } = createService({
      user: { findUnique: vi.fn().mockResolvedValue({ id: "existing-user" }) },
    } as unknown as Partial<PrismaService>);

    await expect(service.register({ name: "Ada", organizationName: "Ada Labs", email: "ada@example.com", password: "VeryStrong!123" })).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("allows admin login only for admin users", async () => {
    const passwordHash = await bcrypt.hash("Admin@123", 4);
    const { service, jwt } = createService({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "admin-id",
          name: "Admin User",
          email: "admin@luminarsecure.com",
          passwordHash,
          role: "ADMIN",
          isActive: true,
        }),
      },
    } as unknown as Partial<PrismaService>);

    const result = await service.adminLogin({ email: "admin@luminarsecure.com", password: "Admin@123" });

    expect(result.user.role).toBe("ADMIN");
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ role: "ADMIN" }));
    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("rejects normal users from the admin login endpoint", async () => {
    const passwordHash = await bcrypt.hash("User@123", 4);
    const { service } = createService({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-id",
          name: "Vishal Balapure",
          email: "vishal@example.com",
          passwordHash,
          role: "USER",
          isActive: true,
        }),
      },
    } as unknown as Partial<PrismaService>);

    await expect(service.adminLogin({ email: "vishal@example.com", password: "User@123" })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("audits failed admin login attempts without exposing credential details", async () => {
    const { service, prisma } = createService({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as Partial<PrismaService>);

    await expect(service.adminLogin({ email: "missing@example.com", password: "WrongPass123" }, "127.0.0.1")).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "ADMIN_LOGIN_FAILED",
          userId: null,
          metadata: expect.objectContaining({ email: "missing@example.com", ipAddress: "127.0.0.1", reason: "INVALID_CREDENTIALS" }),
        }),
      }),
    );
  });
});
