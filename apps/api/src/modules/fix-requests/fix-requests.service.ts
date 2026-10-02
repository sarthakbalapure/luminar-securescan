import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { FixRequestStatus } from "@prisma/client";
import { PrismaService } from "../../prisma.service";
import { SubscriptionService } from "../subscriptions/subscription.service";
import type { AssignFixRequestDto, CreateFixRequestDto, ReplyFixRequestDto, UpdateFixRequestStatusDto } from "./dto";

const requestInclude = {
  organization: { select: { id: true, name: true, slug: true } },
  requester: { select: { id: true, name: true, email: true } },
  assignedAdmin: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true } },
  asset: { select: { id: true, name: true, url: true } },
  scan: { select: { id: true, scanType: true, status: true } },
  finding: { select: { id: true, title: true, severity: true, status: true, category: true, remediationSummary: true } },
} as const;

@Injectable()
export class FixRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  async create(userId: string, dto: CreateFixRequestDto) {
    const finding = await this.prisma.finding.findFirst({
      where: { id: dto.findingId, asset: { project: { organization: { isActive: true, members: { some: { userId } } } } } },
      select: {
        id: true,
        scanId: true,
        assetId: true,
        severity: true,
        asset: { select: { projectId: true, project: { select: { organizationId: true } } } },
      },
    });
    if (!finding) throw new NotFoundException("Finding not found.");
    const organizationId = finding.asset.project.organizationId;
    await this.subscriptions.assertCanCreateFixRequest(organizationId, userId);
    const request = await this.prisma.fixSupportRequest.create({
      data: {
        organizationId,
        projectId: finding.asset.projectId,
        assetId: finding.assetId,
        scanId: finding.scanId,
        findingId: finding.id,
        requestedBy: userId,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        severity: finding.severity,
      },
      include: requestInclude,
    });
    try {
      await this.subscriptions.incrementFixRequestUsage(organizationId, userId, request.id);
    } catch (error) {
      await this.prisma.fixSupportRequest.delete({ where: { id: request.id } }).catch(() => undefined);
      throw error;
    }
    return request;
  }

  findAllForUser(userId: string) {
    return this.prisma.fixSupportRequest.findMany({
      where: { organization: { members: { some: { userId } } } },
      include: requestInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdForUser(id: string, userId: string) {
    const request = await this.prisma.fixSupportRequest.findFirst({
      where: { id, organization: { members: { some: { userId } } } },
      include: requestInclude,
    });
    if (!request) throw new NotFoundException("Fix support request not found.");
    return request;
  }

  async customerReply(id: string, userId: string, dto: ReplyFixRequestDto) {
    const existing = await this.findByIdForUser(id, userId);
    if (existing.status === FixRequestStatus.RESOLVED || existing.status === FixRequestStatus.CLOSED) {
      throw new BadRequestException("This fix support request is already closed.");
    }
    const request = await this.prisma.fixSupportRequest.update({
      where: { id },
      data: { customerResponse: dto.message.trim(), status: FixRequestStatus.IN_REVIEW },
      include: requestInclude,
    });
    await this.audit(request.organizationId, userId, "FIX_REQUEST_CUSTOMER_REPLIED", request.id);
    return request;
  }

  findAllForAdmin() {
    return this.prisma.fixSupportRequest.findMany({ include: requestInclude, orderBy: { createdAt: "desc" }, take: 250 });
  }

  async findByIdForAdmin(id: string) {
    const request = await this.prisma.fixSupportRequest.findUnique({ where: { id }, include: requestInclude });
    if (!request) throw new NotFoundException("Fix support request not found.");
    return request;
  }

  async updateStatus(id: string, adminUserId: string, dto: UpdateFixRequestStatusDto) {
    const existing = await this.findByIdForAdmin(id);
    const request = await this.prisma.fixSupportRequest.update({
      where: { id },
      data: {
        status: dto.status,
        resolvedAt: dto.status === FixRequestStatus.RESOLVED || dto.status === FixRequestStatus.CLOSED ? new Date() : null,
      },
      include: requestInclude,
    });
    await this.audit(existing.organizationId, adminUserId, "FIX_REQUEST_STATUS_CHANGED", id, { status: dto.status });
    return request;
  }

  async assign(id: string, adminUserId: string, dto: AssignFixRequestDto) {
    const existing = await this.findByIdForAdmin(id);
    const assignedToAdmin = dto.adminUserId ?? adminUserId;
    const admin = await this.prisma.user.findFirst({
      where: { id: assignedToAdmin, role: { in: ["ADMIN", "PLATFORM_ADMIN"] }, isActive: true },
      select: { id: true },
    });
    if (!admin) throw new ForbiddenException("The selected user is not an active administrator.");
    const request = await this.prisma.fixSupportRequest.update({
      where: { id },
      data: { assignedToAdmin, status: existing.status === FixRequestStatus.OPEN ? FixRequestStatus.IN_REVIEW : existing.status },
      include: requestInclude,
    });
    await this.audit(existing.organizationId, adminUserId, "FIX_REQUEST_ASSIGNED", id, { assignedToAdmin });
    return request;
  }

  async respond(id: string, adminUserId: string, dto: ReplyFixRequestDto) {
    const existing = await this.findByIdForAdmin(id);
    const request = await this.prisma.fixSupportRequest.update({
      where: { id },
      data: {
        adminResponse: dto.message.trim(),
        assignedToAdmin: existing.assignedToAdmin ?? adminUserId,
        status: FixRequestStatus.WAITING_FOR_CUSTOMER,
      },
      include: requestInclude,
    });
    await this.audit(existing.organizationId, adminUserId, "FIX_REQUEST_RESPONDED", id);
    return request;
  }

  private audit(organizationId: string, userId: string, action: string, requestId: string, metadata?: object) {
    return this.prisma.auditLog.create({
      data: { organizationId, userId, action, entityType: "FixSupportRequest", entityId: requestId, metadata },
    });
  }
}
