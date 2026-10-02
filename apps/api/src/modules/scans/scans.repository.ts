import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ScansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(assetId?: string) {
    return this.prisma.scan.findMany({
      where: assetId ? { assetId } : undefined,
      include: {
        asset: { select: { id: true, name: true, url: true } },
        creator: { select: { id: true, name: true, email: true } },
        jobs: true,
        reports: true,
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string, assetId?: string) {
    return this.prisma.scan.findMany({
      where: {
        ...(assetId ? { assetId } : {}),
        asset: { project: { organization: { isActive: true, members: { some: { userId } } } } },
      },
      include: {
        asset: { select: { id: true, name: true, url: true } },
        creator: { select: { id: true, name: true, email: true } },
        jobs: true,
        reports: true,
        _count: { select: { findings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.scan.findUnique({
      where: { id },
      include: { asset: { include: { project: { select: { organizationId: true } } } }, jobs: true, findings: true, reports: true },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.scan.findFirst({
      where: { id, asset: { project: { organization: { isActive: true, members: { some: { userId } } } } } },
      include: { asset: { include: { project: { select: { organizationId: true } } } }, jobs: true, findings: true, reports: true },
    });
  }

  create(data: Prisma.ScanCreateInput) {
    return this.prisma.scan.create({ data });
  }

  delete(id: string) {
    return this.prisma.scan.delete({ where: { id } });
  }

  updateQueueFailure(id: string, message: string) {
    return this.prisma.scan.update({
      where: { id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        summaryJson: { queueError: message },
      },
    });
  }

  countRecentForOrganization(organizationId: string, since: Date) {
    return this.prisma.scan.count({
      where: {
        createdAt: { gte: since },
        asset: { project: { organizationId } },
      },
    });
  }

  countActiveForOrganization(organizationId: string) {
    return this.prisma.scan.count({
      where: {
        status: { in: ['QUEUED', 'RUNNING'] },
        asset: { project: { organizationId } },
      },
    });
  }
}
