import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationsService } from './organizations.service';
import type { OrganizationsRepository } from './organizations.repository';
import type { PrismaService } from '../../prisma.service';

describe('OrganizationsService', () => {
  it('throws for an unknown organization', async () => {
    const repository = { findByIdForUser: vi.fn().mockResolvedValue(null) };
    const prisma = { auditLog: { create: vi.fn() } };
    const service = new OrganizationsService(
      repository as unknown as OrganizationsRepository,
      prisma as unknown as PrismaService,
      { ensureDefaultSubscription: vi.fn() } as never,
    );
    await expect(service.findById('missing', 'user-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates the owner membership with the organization', async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: 'organization-id', slug: 'acme' }) };
    const prisma = { auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-id' }) } };
    const service = new OrganizationsService(
      repository as unknown as OrganizationsRepository,
      prisma as unknown as PrismaService,
      { ensureDefaultSubscription: vi.fn().mockResolvedValue({ id: 'subscription-id' }) } as never,
    );

    await service.create({ name: 'Acme', slug: 'acme' }, 'owner-id');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ members: { create: { userId: 'owner-id', role: 'OWNER' } } }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'USER_CREATED_ORGANIZATION' }) }),
    );
  });
});
