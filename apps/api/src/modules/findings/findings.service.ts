import { Injectable, NotFoundException } from '@nestjs/common';
import type { FindingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { FindingsRepository } from './findings.repository';

@Injectable()
export class FindingsService {
  constructor(
    private readonly findings: FindingsRepository,
    private readonly prisma?: PrismaService,
  ) {}

  findAll(userId: string, scanId?: string, assetId?: string) {
    return this.findings.findAllForUser(userId, scanId, assetId);
  }

  async findById(id: string, userId: string) {
    const finding = await this.findings.findByIdForUser(id, userId);
    if (!finding) throw new NotFoundException('Finding not found.');
    await this.auditFindingAction(finding.asset?.id, userId, 'USER_VIEWED_FINDING', finding.id);
    return finding;
  }

  async updateStatus(id: string, userId: string, status: FindingStatus) {
    const finding = await this.findings.findByIdForUser(id, userId);
    if (!finding) throw new NotFoundException('Finding not found.');
    const updated = await this.findings.updateStatusForUser(id, userId, status);
    await this.auditFindingAction(finding.asset?.id, userId, 'USER_UPDATED_FINDING_STATUS', finding.id, { status });
    return updated;
  }

  private async auditFindingAction(assetId: string, userId: string, action: string, findingId: string, metadata?: object) {
    if (!assetId || !this.prisma) return null;
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, project: { organization: { members: { some: { userId } } } } },
      select: { project: { select: { organizationId: true } } },
    });
    if (!asset) return null;
    return this.prisma.auditLog.create({
      data: { organizationId: asset.project.organizationId, userId, action, entityType: 'Finding', entityId: findingId, metadata },
    });
  }
}
