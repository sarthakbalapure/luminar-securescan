import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class FindingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(scanId?: string, assetId?: string) {
    return this.prisma.finding.findMany({
      where: { ...(scanId ? { scanId } : {}), ...(assetId ? { assetId } : {}) },
      include: { evidence: true, recommendations: true },
      orderBy: [{ severity: 'asc' }, { lastDetectedAt: 'desc' }],
    });
  }

  findAllForUser(userId: string, scanId?: string, assetId?: string) {
    return this.prisma.finding.findMany({
      where: {
        ...(scanId ? { scanId } : {}),
        ...(assetId ? { assetId } : {}),
        asset: { project: { organization: { isActive: true, members: { some: { userId } } } } },
      },
      include: { evidence: true, recommendations: true },
      orderBy: [{ severity: 'asc' }, { lastDetectedAt: 'desc' }],
    });
  }

  findById(id: string) {
    return this.prisma.finding.findUnique({
      where: { id },
      include: { asset: { include: { project: { select: { organizationId: true } } } }, scan: true, evidence: true, recommendations: true },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.finding.findFirst({
      where: { id, asset: { project: { organization: { isActive: true, members: { some: { userId } } } } } },
      include: { asset: { include: { project: { select: { organizationId: true } } } }, scan: true, evidence: true, recommendations: true },
    });
  }

  updateStatusForUser(id: string, userId: string, status: import('@prisma/client').FindingStatus) {
    return this.prisma.finding.update({
      where: { id },
      data: {
        status,
        fixedAt: status === 'FIXED' ? new Date() : null,
      },
      include: { asset: { include: { project: { select: { organizationId: true } } } }, scan: true, evidence: true, recommendations: true },
    });
  }
}
