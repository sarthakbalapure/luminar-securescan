import { BadRequestException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { AssetType, ScanType } from '@prisma/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AssetsRepository } from '../assets/assets.repository';
import { PrismaService } from '../../prisma.service';
import { assertSaasScanTargetAllowed } from '../../utils/url-safety';
import type { CreateScanDto } from './dto/create-scan.dto';
import type { CreateSqlmapScanDto } from './dto/create-sqlmap-scan.dto';
import { encryptRepositoryToken, encryptSensitiveToken } from './repository-token-crypto';
import { SCAN_QUEUE, type ScanQueue } from './scan-queue';
import { ScansRepository } from './scans.repository';
import { SubscriptionService } from '../subscriptions/subscription.service';

const WEBSITE_CHECKS = [
  'HTTPS_CHECK',
  'SECURITY_HEADERS_CHECK',
  'COOKIE_SECURITY_CHECK',
  'EXPOSED_FILES_CHECK',
  'TLS_SUMMARY_CHECK',
] as const;

const ZAP_BASELINE_CHECK = 'ZAP_BASELINE_SCAN' as const;
const ZAP_FULL_CHECK = 'ZAP_FULL_SCAN' as const;
const NUCLEI_SAFE_BASELINE_CHECK = 'NUCLEI_SAFE_BASELINE_SCAN' as const;
const NUCLEI_CVE_CHECK = 'NUCLEI_CVE_SCAN' as const;
const NUCLEI_FULL_CHECK = 'NUCLEI_FULL_SCAN' as const;
const SQLMAP_DETECTION_CHECK = 'SQLMAP_DETECTION_SCAN' as const;
const API_CHECKS = [
  'OPENAPI_SPEC_CHECK',
  'API_SAFE_ENDPOINT_CHECK',
] as const;
const REPOSITORY_CHECKS = ['REPOSITORY_SECURITY_SCAN'] as const;
const repositoryBranchPattern = /^[A-Za-z0-9._/-]{1,120}$/;
const execFileAsync = promisify(execFile);

@Injectable()
export class ScansService {
  constructor(
    private readonly scans: ScansRepository,
    private readonly assets: AssetsRepository,
    @Inject(SCAN_QUEUE) private readonly scanQueue: ScanQueue,
    private readonly prisma?: PrismaService,
    @Optional() private readonly subscriptions?: SubscriptionService,
  ) {}

  findAll(userId?: string, assetId?: string) {
    return userId ? this.scans.findAllForUser(userId, assetId) : this.scans.findAll(assetId);
  }

  async findById(id: string, userId?: string) {
    const scan = userId ? await this.scans.findByIdForUser(id, userId) : await this.scans.findById(id);
    if (!scan) throw new NotFoundException('Scan not found.');
    return scan;
  }

  async create(dto: CreateScanDto, userId?: string) {
    const creatorId = userId ?? dto.createdBy;
    if (!creatorId) throw new BadRequestException('Authenticated user is required to queue a scan.');
    if (!dto.authorizationConfirmed) {
      throw new BadRequestException('Authorization confirmation is required before starting a scan.');
    }

    const asset = await this.assets.findByIdForUser(dto.assetId, creatorId);
    if (!asset) throw new NotFoundException('Asset not found.');
    if (asset.project?.organizationId) {
      await this.subscriptions?.assertCanRunScan(asset.project.organizationId);
      await this.enforceOrganizationScanLimits(asset.project.organizationId);
    }
    const requestedScanner = dto.scanner ?? (dto.scanMode?.startsWith('zap_') ? 'owasp_zap' : dto.scanMode?.startsWith('nuclei_') ? 'nuclei' : 'internal');
    const requestedScanMode = dto.scanMode ?? (
      requestedScanner === 'owasp_zap'
        ? (process.env.ZAP_DEFAULT_SCAN_MODE === 'full' ? 'zap_full' : 'zap_baseline')
        : requestedScanner === 'nuclei'
          ? defaultNucleiScanMode()
          : 'baseline'
    );
    if (requestedScanner === 'owasp_zap') {
      if (process.env.ZAP_ENABLED === 'false') {
        throw new ServiceUnavailableException('OWASP ZAP scanning is disabled.');
      }
      if (dto.scanType !== ScanType.WEBSITE_BASELINE || (asset.type !== AssetType.WEBSITE && asset.type !== AssetType.WEB_APP)) {
        throw new BadRequestException('OWASP ZAP scans require a website or web application asset.');
      }
      await assertSaasScanTargetAllowed(asset.url);
      if (!['zap_baseline', 'zap_full'].includes(requestedScanMode)) {
        throw new BadRequestException('Unsupported OWASP ZAP scan mode.');
      }
      if (requestedScanMode === 'zap_full' && dto.fullScanConfirmed !== true) {
        throw new BadRequestException('Full scan confirmation is required before starting an OWASP ZAP full scan.');
      }
      await this.enforceZapConcurrency();
    }
    if (requestedScanner === 'nuclei') {
      if (process.env.NUCLEI_ENABLED === 'false') {
        throw new ServiceUnavailableException('Nuclei scanning is disabled.');
      }
      if (dto.scanType !== ScanType.WEBSITE_BASELINE || (asset.type !== AssetType.WEBSITE && asset.type !== AssetType.WEB_APP)) {
        throw new BadRequestException('Nuclei scans require a website or web application asset.');
      }
      await assertSaasScanTargetAllowed(asset.url);
      if (!['nuclei_safe_baseline', 'nuclei_cve', 'nuclei_full'].includes(requestedScanMode)) {
        throw new BadRequestException('Unsupported Nuclei scan mode.');
      }
      if (requestedScanMode === 'nuclei_full' && dto.fullScanConfirmed !== true) {
        throw new BadRequestException('Full template scan confirmation is required before starting a Nuclei full scan.');
      }
      await this.enforceNucleiConcurrency();
      await this.checkNucleiAvailability();
    }
    if (dto.scanType === ScanType.API_BASELINE && asset.type !== AssetType.API) {
      throw new BadRequestException('API baseline scans require an API asset.');
    }
    if (dto.scanType === ScanType.API_BASELINE && !asset.apiSpecification) {
      throw new BadRequestException('API baseline scans require a stored OpenAPI specification.');
    }
    if (dto.scanType === ScanType.REPO_SCAN && asset.type !== AssetType.REPOSITORY) {
      throw new BadRequestException('Repository scans require a repository asset.');
    }
    if (dto.repositoryBranch && !repositoryBranchPattern.test(dto.repositoryBranch)) {
      throw new BadRequestException('Repository branch contains unsupported characters.');
    }
    if (dto.repositoryZipBase64) {
      const maxZipBytes = Number(process.env.REPO_ZIP_MAX_BYTES ?? 10 * 1024 * 1024);
      const zipBytes = Math.floor(dto.repositoryZipBase64.length * 0.75);
      if (zipBytes > maxZipBytes) throw new BadRequestException('Repository ZIP upload exceeds the configured size limit.');
    }

    const jobTypes = requestedScanner === 'owasp_zap'
      ? [requestedScanMode === 'zap_full' ? ZAP_FULL_CHECK : ZAP_BASELINE_CHECK]
      : requestedScanner === 'nuclei'
        ? [requestedScanMode === 'nuclei_full' ? NUCLEI_FULL_CHECK : requestedScanMode === 'nuclei_cve' ? NUCLEI_CVE_CHECK : NUCLEI_SAFE_BASELINE_CHECK]
      : dto.scanType === ScanType.API_BASELINE
      ? [...API_CHECKS]
      : dto.scanType === ScanType.REPO_SCAN
        ? [...REPOSITORY_CHECKS]
        : dto.includePassiveBaselineScan ? [...WEBSITE_CHECKS, ZAP_BASELINE_CHECK] : [...WEBSITE_CHECKS];

    const scanCreateData = {
      asset: { connect: { id: dto.assetId } },
      scanType: dto.scanType,
      scanner: requestedScanner,
      scanMode: requestedScanMode,
      status: 'QUEUED',
      creator: { connect: { id: creatorId } },
      summaryJson: {
        authorizationConfirmedAt: new Date().toISOString(),
        scanner: requestedScanner,
        scanMode: requestedScanMode,
        fullScanConfirmed: Boolean(dto.fullScanConfirmed),
        includePassiveBaselineScan: Boolean(dto.includePassiveBaselineScan),
        hasApiBearerToken: Boolean(dto.apiBearerToken),
        scanScopePaths: dto.scanType === ScanType.API_BASELINE ? dto.scanScopePaths ?? [] : undefined,
        repositoryBranch: dto.scanType === ScanType.REPO_SCAN ? dto.repositoryBranch ?? null : undefined,
        hasRepositoryToken: Boolean(dto.repositoryToken),
        hasRepositoryZipUpload: Boolean(dto.repositoryZipBase64),
      },
      jobs: { create: jobTypes.map((jobType) => ({ jobType, status: 'QUEUED' })) },
    } as never;
    const scan = await this.scans.create(scanCreateData);

    if (asset.project?.organizationId && this.subscriptions) {
      try {
        await this.subscriptions.incrementScanUsage(asset.project.organizationId, creatorId, scan.id);
      } catch (error) {
        await this.scans.delete(scan.id).catch(() => undefined);
        throw error;
      }
    }

    try {
      const repositoryTokenCiphertext = dto.scanType === ScanType.REPO_SCAN && dto.repositoryToken
        ? encryptRepositoryToken(dto.repositoryToken)
        : undefined;
      const apiBearerTokenCiphertext = dto.scanType === ScanType.API_BASELINE && dto.apiBearerToken
        ? encryptSensitiveToken(dto.apiBearerToken)
        : undefined;
      await this.scanQueue.add('website-scan', {
        scanId: scan.id,
        ...(apiBearerTokenCiphertext ? { apiBearerTokenCiphertext } : {}),
        ...(dto.scanType === ScanType.API_BASELINE && dto.scanScopePaths?.length ? { scanScopePaths: dto.scanScopePaths } : {}),
        ...(repositoryTokenCiphertext ? { repositoryTokenCiphertext } : {}),
        ...(dto.scanType === ScanType.REPO_SCAN && dto.repositoryBranch ? { repositoryBranch: dto.repositoryBranch } : {}),
        ...(dto.scanType === ScanType.REPO_SCAN && dto.repositoryZipBase64 ? { repositoryZipBase64: dto.repositoryZipBase64 } : {}),
      }, { jobId: scan.id });
      if (asset.project?.organizationId && this.prisma) {
        await this.prisma.auditLog.create({
          data: {
            organizationId: asset.project.organizationId,
            userId: creatorId,
            action: 'USER_STARTED_SCAN',
            entityType: 'Scan',
            entityId: scan.id,
            metadata: { assetId: dto.assetId, scanType: dto.scanType, scanner: requestedScanner, scanMode: requestedScanMode },
          },
        });
        if (requestedScanner === 'owasp_zap') {
          await this.prisma.auditLog.create({
            data: {
              organizationId: asset.project.organizationId,
              userId: creatorId,
              action: requestedScanMode === 'zap_full' ? 'ZAP_FULL_SCAN_STARTED' : 'ZAP_BASELINE_SCAN_STARTED',
              entityType: 'Scan',
              entityId: scan.id,
              metadata: { assetId: dto.assetId, targetUrl: asset.url, scanMode: requestedScanMode },
            },
          });
        }
        if (requestedScanner === 'nuclei') {
          await this.prisma.auditLog.create({
            data: {
              organizationId: asset.project.organizationId,
              userId: creatorId,
              action: requestedScanMode === 'nuclei_full' ? 'NUCLEI_FULL_SCAN_STARTED' : requestedScanMode === 'nuclei_cve' ? 'NUCLEI_CVE_SCAN_STARTED' : 'NUCLEI_SAFE_BASELINE_SCAN_STARTED',
              entityType: 'Scan',
              entityId: scan.id,
              metadata: { assetId: dto.assetId, targetUrl: asset.url, scanMode: requestedScanMode },
            },
          });
        }
      }
    } catch (error) {
      if (asset.project?.organizationId) await this.subscriptions?.rollbackScanUsage(asset.project.organizationId).catch(() => undefined);
      await this.scans.updateQueueFailure(scan.id, error instanceof Error ? error.message : 'Failed to queue scan.');
      throw new ServiceUnavailableException('Scan queue is unavailable. Please retry shortly.');
    }

    return scan;
  }

  async createSqlmapScan(dto: CreateSqlmapScanDto, userId: string) {
    if (!dto.authorizationConfirmed) {
      throw new BadRequestException('Authorization confirmation is required before starting a scan.');
    }
    if (!dto.sqlInjectionTestConfirmed) {
      throw new BadRequestException('SQL injection test confirmation is required before starting this scan.');
    }
    if (process.env.SQLMAP_ENABLED === 'false') {
      throw new ServiceUnavailableException('sqlmap scanning is disabled.');
    }
    if (!dto.parameter?.trim()) {
      throw new BadRequestException('Parameter name is required for SQL injection detection.');
    }
    if (!['GET', 'POST'].includes(dto.method)) {
      throw new BadRequestException('Only GET and POST methods are supported for SQL injection detection.');
    }
    if (dto.authorizationHeader && /[\r\n]/.test(dto.authorizationHeader)) {
      throw new BadRequestException('Authorization header contains unsupported characters.');
    }

    const asset = await this.assets.findByIdForUser(dto.assetId, userId);
    if (!asset) throw new NotFoundException('Asset not found.');
    if (asset.type !== AssetType.WEBSITE && asset.type !== AssetType.WEB_APP && asset.type !== AssetType.API) {
      throw new BadRequestException('SQL injection detection requires a website, web application, or API asset.');
    }
    if (asset.project?.organizationId) {
      await this.subscriptions?.assertCanRunScan(asset.project.organizationId);
      await this.enforceOrganizationScanLimits(asset.project.organizationId);
    }
    const target = await assertSaasScanTargetAllowed(dto.targetUrl);
    this.assertTargetBelongsToAsset(target, asset.url);
    await this.enforceSqlmapConcurrency();
    await this.checkSqlmapAvailability();

    const scanCreateData = {
      asset: { connect: { id: dto.assetId } },
      scanType: ScanType.WEBSITE_BASELINE,
      scanner: 'sqlmap',
      scanMode: 'sqlmap_detection',
      targetUrl: target.toString(),
      testedParameter: dto.parameter.trim(),
      httpMethod: dto.method,
      status: 'QUEUED',
      creator: { connect: { id: userId } },
      summaryJson: {
        authorizationConfirmedAt: new Date().toISOString(),
        scanner: 'sqlmap',
        scanMode: 'sqlmap_detection',
        targetUrl: target.toString(),
        testedParameter: dto.parameter.trim(),
        httpMethod: dto.method,
        hasPostBody: Boolean(dto.postBody),
        hasAuthorizationHeader: Boolean(dto.authorizationHeader),
      },
      jobs: { create: [{ jobType: SQLMAP_DETECTION_CHECK, status: 'QUEUED' }] },
    } as never;
    const scan = await this.scans.create(scanCreateData);

    if (asset.project?.organizationId && this.subscriptions) {
      try {
        await this.subscriptions.incrementScanUsage(asset.project.organizationId, userId, scan.id);
      } catch (error) {
        await this.scans.delete(scan.id).catch(() => undefined);
        throw error;
      }
    }

    try {
      await this.scanQueue.add('website-scan', {
        scanId: scan.id,
        sqlmapConfig: {
          targetUrl: target.toString(),
          method: dto.method,
          parameter: dto.parameter.trim(),
          ...(dto.method === 'POST' && dto.postBody ? { postBody: dto.postBody } : {}),
          ...(dto.authorizationHeader ? { authorizationHeader: dto.authorizationHeader } : {}),
        },
      }, { jobId: scan.id });
      if (asset.project?.organizationId && this.prisma) {
        await this.prisma.auditLog.create({
          data: {
            organizationId: asset.project.organizationId,
            userId,
            action: 'SQLMAP_SCAN_STARTED',
            entityType: 'Scan',
            entityId: scan.id,
            metadata: { assetId: dto.assetId, targetUrl: target.toString(), testedParameter: dto.parameter.trim(), method: dto.method },
          },
        });
      }
    } catch (error) {
      if (asset.project?.organizationId) await this.subscriptions?.rollbackScanUsage(asset.project.organizationId).catch(() => undefined);
      await this.scans.updateQueueFailure(scan.id, error instanceof Error ? error.message : 'Failed to queue scan.');
      throw new ServiceUnavailableException('Scan queue is unavailable. Please retry shortly.');
    }

    return scan;
  }

  private async enforceOrganizationScanLimits(organizationId: string) {
    const windowMinutes = Number(process.env.SCAN_RATE_LIMIT_WINDOW_MINUTES ?? 60);
    const maxQueuedPerWindow = Number(process.env.SCAN_RATE_LIMIT_MAX_PER_ORG ?? 20);
    const maxActive = Number(process.env.SCAN_CONCURRENCY_MAX_PER_ORG ?? 3);
    const since = new Date(Date.now() - windowMinutes * 60 * 1000);
    const [recent, active] = await Promise.all([
      this.scans.countRecentForOrganization(organizationId, since),
      this.scans.countActiveForOrganization(organizationId),
    ]);

    if (recent >= maxQueuedPerWindow) {
      throw new HttpException(`Scan limit reached for this organization. Please retry after the ${windowMinutes}-minute window.`, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (active >= maxActive) {
      throw new HttpException('Too many scans are already queued or running for this organization.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async enforceZapConcurrency() {
    if (!this.prisma) return;
    const maxConcurrent = Number(process.env.ZAP_MAX_CONCURRENT_SCANS ?? 1);
    const active = await this.prisma.scan.count({
      where: {
        scanner: 'owasp_zap',
        status: { in: ['QUEUED', 'RUNNING'] },
      } as never,
    });
    if (active >= maxConcurrent) {
      throw new HttpException('Too many OWASP ZAP scans are already queued or running.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async enforceNucleiConcurrency() {
    if (!this.prisma) return;
    const maxConcurrent = Number(process.env.NUCLEI_MAX_CONCURRENT_SCANS ?? 1);
    const active = await this.prisma.scan.count({
      where: {
        scanner: 'nuclei',
        status: { in: ['QUEUED', 'RUNNING'] },
      } as never,
    });
    if (active >= maxConcurrent) {
      throw new HttpException('Too many Nuclei scans are already queued or running.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async enforceSqlmapConcurrency() {
    if (!this.prisma) return;
    const maxConcurrent = Number(process.env.SQLMAP_MAX_CONCURRENT_SCANS ?? 1);
    const active = await this.prisma.scan.count({
      where: {
        scanner: 'sqlmap',
        status: { in: ['QUEUED', 'RUNNING'] },
      } as never,
    });
    if (active >= maxConcurrent) {
      throw new HttpException('Too many sqlmap scans are already queued or running.', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async checkNucleiAvailability() {
    if (process.env.NODE_ENV === 'test') return;
    const binary = process.env.NUCLEI_BINARY_PATH ?? 'nuclei';
    try {
      await execFileAsync(binary, ['-version'], { timeout: 10_000, windowsHide: true });
    } catch {
      throw new ServiceUnavailableException('Nuclei scanner is unavailable. Please check Nuclei configuration and try again.');
    }
  }

  private async checkSqlmapAvailability() {
    if (process.env.NODE_ENV === 'test') return;
    const binary = process.env.SQLMAP_BINARY_PATH ?? 'sqlmap';
    try {
      await execFileAsync(binary, ['--version'], { timeout: 10_000, windowsHide: true });
    } catch {
      throw new ServiceUnavailableException('sqlmap scanner is unavailable. Please check sqlmap configuration.');
    }
  }

  private assertTargetBelongsToAsset(target: URL, assetUrl: string) {
    let asset: URL;
    try {
      asset = new URL(assetUrl);
    } catch {
      throw new BadRequestException('Selected asset has an invalid URL.');
    }
    const targetHost = target.hostname.toLowerCase();
    const assetHost = asset.hostname.toLowerCase();
    if (targetHost !== assetHost && !targetHost.endsWith(`.${assetHost}`)) {
      throw new BadRequestException('Target URL must belong to the selected asset domain.');
    }
  }
}

function defaultNucleiScanMode() {
  if (process.env.NUCLEI_DEFAULT_SCAN_MODE === 'cve') return 'nuclei_cve';
  if (process.env.NUCLEI_DEFAULT_SCAN_MODE === 'full') return 'nuclei_full';
  return 'nuclei_safe_baseline';
}
