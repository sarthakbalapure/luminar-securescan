import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateProjectDto } from './dto/create-project.dto';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { ProjectsRepository } from './projects.repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly projects: ProjectsRepository,
    private readonly organizations: OrganizationsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(userId: string, organizationId?: string) {
    return this.projects.findAllForUser(userId, organizationId);
  }

  async findById(id: string, userId: string) {
    const project = await this.projects.findByIdForUser(id, userId);
    if (!project) throw new NotFoundException('Project not found.');
    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    if (!(await this.organizations.findByIdForUser(dto.organizationId, userId))) {
      throw new NotFoundException('Organization not found.');
    }
    const project = await this.projects.create({
      organizationId: dto.organizationId,
      name: dto.name.trim(),
      description: dto.description?.trim(),
    });
    await this.prisma.auditLog.create({
      data: {
        organizationId: project.organizationId,
        userId,
        action: 'USER_CREATED_PROJECT',
        entityType: 'Project',
        entityId: project.id,
        metadata: { name: project.name },
      },
    });
    return project;
  }
}
