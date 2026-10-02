import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.organization.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, projects: true } },
        subscriptionPlans: { where: { isActive: true }, orderBy: { validFrom: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.organization.findMany({
      where: { isActive: true, members: { some: { userId } } },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { members: true, projects: true } },
        subscriptionPlans: { where: { isActive: true }, orderBy: { validFrom: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, subscriptionPlans: true },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.organization.findFirst({
      where: { id, isActive: true, members: { some: { userId } } },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } }, subscriptionPlans: true },
    });
  }

  create(data: Prisma.OrganizationCreateInput) {
    return this.prisma.organization.create({ data });
  }
}
