import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma.service";
import type { LoginDto, RegisterDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("A user with this email already exists.");

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: "USER",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    const organization = await this.prisma.organization.create({
      data: {
        name: dto.organizationName.trim(),
        slug: `personal-${user.id.slice(0, 8)}`,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
      select: { id: true },
    });

    await this.audit(organization.id, user.id, "USER_REGISTERED", "User", user.id, { email: user.email });
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.auditUserLoginAttempt(null, "USER_LOGIN_FAILED", { email, reason: "INVALID_CREDENTIALS" });
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (!user.isActive) {
      await this.auditUserLoginAttempt(user.id, "USER_LOGIN_FAILED", { email: user.email, reason: "INACTIVE_ACCOUNT" });
      throw new UnauthorizedException("Your account is inactive. Please contact support.");
    }

    await this.auditUserLogin(user.id, isAdminRole(user.role) ? "ADMIN_LOGIN" : "USER_LOGIN_SUCCESS", { email: user.email });

    return this.issueToken(user);
  }

  async adminLogin(dto: LoginDto, ipAddress?: string) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, passwordHash: true, role: true, isActive: true },
    });

    if (!user?.isActive || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.auditAdminLoginAttempt(null, "ADMIN_LOGIN_FAILED", { email, ipAddress, reason: "INVALID_CREDENTIALS" });
      throw new UnauthorizedException("Invalid email or password.");
    }

    if (!isAdminRole(user.role)) {
      await this.auditAdminLoginAttempt(user.id, "ADMIN_LOGIN_FAILED", { email: user.email, ipAddress, reason: "NON_ADMIN_ROLE" });
      throw new UnauthorizedException("Access denied. Admin privileges required.");
    }

    await this.auditAdminLoginAttempt(user.id, "ADMIN_LOGIN_SUCCESS", { email: user.email, ipAddress });
    return this.issueToken(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        organizationMembers: {
          select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) throw new UnauthorizedException("User not found.");
    return user;
  }

  async logout(userId: string) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) {
      await this.audit(membership.organizationId, userId, "USER_LOGOUT", "User", userId);
    }
    return { success: true };
  }

  private issueToken(user: { id: string; name: string; email: string; role: string }) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: normalizeRole(user.role) }),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }

  private async auditUserLogin(userId: string, action: string, metadata?: object) {
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });
    const fallbackOrganization = membership ? null : await this.prisma.organization.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const organizationId = membership?.organizationId ?? fallbackOrganization?.id;
    if (!organizationId) return null;
    return this.audit(organizationId, userId, action, "User", userId, metadata);
  }

  private async auditUserLoginAttempt(userId: string | null, action: string, metadata: object) {
    const membership = userId
      ? await this.prisma.organizationMember.findFirst({
          where: { userId },
          select: { organizationId: true },
          orderBy: { createdAt: "asc" },
        })
      : null;
    const fallbackOrganization = membership ? null : await this.prisma.organization.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const organizationId = membership?.organizationId ?? fallbackOrganization?.id;
    if (!organizationId) return null;
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType: "User", entityId: userId, metadata },
    });
  }

  private async auditAdminLoginAttempt(userId: string | null, action: string, metadata: object) {
    const organization = userId
      ? await this.prisma.organizationMember.findFirst({
          where: { userId },
          select: { organizationId: true },
          orderBy: { createdAt: "asc" },
        })
      : null;
    const fallbackOrganization = organization ? null : await this.prisma.organization.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
    const organizationId = organization?.organizationId ?? fallbackOrganization?.id;
    if (!organizationId) return null;
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType: "User", entityId: userId, metadata },
    });
  }

  private audit(organizationId: string, userId: string, action: string, entityType: string, entityId: string, metadata?: object) {
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType, entityId, metadata },
    });
  }
}

function isAdminRole(role: string) {
  return role === "ADMIN" || role === "PLATFORM_ADMIN";
}

function normalizeRole(role: string) {
  return isAdminRole(role) ? "ADMIN" : "USER";
}
