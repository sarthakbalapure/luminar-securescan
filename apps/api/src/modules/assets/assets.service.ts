import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssetType, type Prisma } from '@prisma/client';
import { assertPublicHttpUrl, parseOpenApiSpec } from '@luminar-iq/shared';
import type { CreateAssetDto } from './dto/create-asset.dto';
import { ProjectsRepository } from '../projects/projects.repository';
import { AssetsRepository } from './assets.repository';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly assets: AssetsRepository,
    private readonly projects: ProjectsRepository,
    private readonly prisma: PrismaService,
  ) {}

  findAll(userId: string, projectId?: string) {
    return this.assets.findAllForUser(userId, projectId);
  }

  async findById(id: string, userId?: string) {
    const asset = userId ? await this.assets.findByIdForUser(id, userId) : await this.assets.findById(id);
    if (!asset) throw new NotFoundException('Asset not found.');
    return asset;
  }

  async create(dto: CreateAssetDto, userId: string) {
    const project = await this.projects.findByIdForUser(dto.projectId, userId);
    if (!project) throw new NotFoundException('Project not found.');
    const { openApiSpecContent, openApiSpecUrl, baseApiUrl, environment, businessCriticality, ...assetInput } = dto;
    const apiSpec = dto.type === AssetType.API
      ? await this.prepareApiSpecification({ openApiSpecContent, openApiSpecUrl, baseApiUrl, fallbackUrl: dto.url })
      : null;
    const asset = await this.assets.create({ ...assetInput, environment, businessCriticality, name: dto.name.trim() } as never);
    if (apiSpec) {
      await this.prisma.apiSpecification.create({
        data: {
          assetId: asset.id,
          sourceType: openApiSpecUrl ? 'URL' : 'UPLOAD',
          specUrl: openApiSpecUrl,
          baseUrl: apiSpec.baseUrl,
          rawContent: apiSpec.rawContent,
          parsedJson: apiSpec.parsed.document as Prisma.InputJsonValue,
          endpointsJson: apiSpec.parsed.endpoints as Prisma.InputJsonValue,
        },
      });
    }
    await this.prisma.auditLog.create({
      data: {
        organizationId: project.organizationId,
        userId,
        action: 'USER_ADDED_ASSET',
        entityType: 'Asset',
        entityId: asset.id,
        metadata: { name: asset.name, url: asset.url, type: asset.type, environment: environment ?? null, businessCriticality: businessCriticality ?? null },
      },
    });
    return this.assets.findById(asset.id);
  }

  private async prepareApiSpecification(input: {
    openApiSpecContent?: string;
    openApiSpecUrl?: string;
    baseApiUrl?: string;
    fallbackUrl: string;
  }) {
    if (!input.openApiSpecContent && !input.openApiSpecUrl) {
      throw new BadRequestException('API assets require an OpenAPI JSON/YAML upload or OpenAPI URL.');
    }

    const rawContent = input.openApiSpecContent?.trim() || await this.fetchOpenApiSpec(input.openApiSpecUrl!);
    const parsed = parseOpenApiSpec(rawContent);
    const baseUrl = input.baseApiUrl || parsed.baseUrls[0] || input.fallbackUrl;
    assertPublicHttpUrl(baseUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === 'true');
    if (input.openApiSpecUrl) assertPublicHttpUrl(input.openApiSpecUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === 'true');
    return { rawContent, parsed, baseUrl };
  }

  private async fetchOpenApiSpec(specUrl: string) {
    const url = assertPublicHttpUrl(specUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === 'true');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAPI_FETCH_TIMEOUT_MS ?? 8000));
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json,application/yaml,text/yaml,text/plain,*/*;q=0.2' },
        signal: controller.signal,
        redirect: 'manual',
      });
      if (!response.ok) throw new BadRequestException(`OpenAPI URL returned HTTP ${response.status}.`);
      const text = await response.text();
      if (text.length > Number(process.env.OPENAPI_MAX_SPEC_BYTES ?? 500000)) {
        throw new BadRequestException('OpenAPI specification is too large.');
      }
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }
}
