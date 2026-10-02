import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(projectId?: string) {
    return this.prisma.asset.findMany({
      where: projectId ? { projectId } : undefined,
      include: { project: { select: { id: true, name: true, organizationId: true } }, apiSpecification: true, _count: { select: { scans: true, findings: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string, projectId?: string) {
    return this.prisma.asset.findMany({
      where: {
        ...(projectId ? { projectId } : {}),
        project: { organization: { isActive: true, members: { some: { userId } } } },
      },
      include: {
        project: { select: { id: true, name: true, organizationId: true } },
        apiSpecification: true,
        _count: { select: { scans: true, findings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.asset.findUnique({ where: { id }, include: { project: true, apiSpecification: true } });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.asset.findFirst({
      where: { id, project: { organization: { isActive: true, members: { some: { userId } } } } },
      include: { project: true, apiSpecification: true },
    });
  }

  create(data: Prisma.AssetUncheckedCreateInput) {
    return this.prisma.asset.create({ data });
  }
}
