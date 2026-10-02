import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsRepository } from './organizations.repository';
import { PrismaService } from '../../prisma.service';
import { SubscriptionService } from '../subscriptions/subscription.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizations: OrganizationsRepository,
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionService,
  ) {}

  findAll(userId: string) {
    return this.organizations.findAllForUser(userId);
  }

  async findById(id: string, userId: string) {
    const organization = await this.organizations.findByIdForUser(id, userId);
    if (!organization) throw new NotFoundException('Organization not found.');
    return organization;
  }

  async create(dto: CreateOrganizationDto, userId: string) {
    const organization = await this.organizations.create({
      name: dto.name.trim(),
      slug: dto.slug,
      owner: { connect: { id: userId } },
      members: { create: { userId, role: 'OWNER' } },
    });
    await this.subscriptions.ensureDefaultSubscription(organization.id, userId);
    await this.prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        userId,
        action: 'USER_CREATED_ORGANIZATION',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: { slug: organization.slug },
      },
    });
    return organization;
  }

  async assertMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true },
    });
    if (!membership) throw new ForbiddenException('You do not have access to this organization.');
  }
}
