import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId?: string) {
    return this.prisma.project.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: { organization: { select: { id: true, name: true, slug: true } }, _count: { select: { assets: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string, organizationId?: string) {
    return this.prisma.project.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        organization: { isActive: true, members: { some: { userId } } },
      },
      include: { organization: { select: { id: true, name: true, slug: true } }, _count: { select: { assets: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.project.findUnique({ where: { id }, include: { assets: true } });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.project.findFirst({
      where: { id, organization: { isActive: true, members: { some: { userId } } } },
      include: { organization: { select: { id: true, name: true, slug: true } }, assets: true },
    });
  }

  create(data: Prisma.ProjectUncheckedCreateInput) {
    return this.prisma.project.create({ data });
  }
}
