import { BadRequestException } from '@nestjs/common';
import { AssetType, ScanType, VerificationStatus } from '@prisma/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetsRepository } from '../assets/assets.repository';
import type { ScansRepository } from './scans.repository';
import { ScansService } from './scans.service';

describe('ScansService', () => {
  const scans = { create: vi.fn(), delete: vi.fn(), updateQueueFailure: vi.fn(), countRecentForOrganization: vi.fn().mockResolvedValue(0), countActiveForOrganization: vi.fn().mockResolvedValue(0) };
  const queue = { add: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('JWT_SECRET', 'unit-test-secret-for-repository-token-encryption');
    scans.create.mockResolvedValue({ id: 'scan-id' });
    queue.add.mockResolvedValue({ id: 'scan-id' });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects scans without explicit authorization', async () => {
    const service = new ScansService(
      scans as unknown as ScansRepository,
      { findByIdForUser: vi.fn() } as unknown as AssetsRepository,
      queue as never,
    );
    await expect(
      service.create({
        assetId: 'asset-id',
        scanType: ScanType.WEBSITE_BASELINE,
        createdBy: 'user-id',
        authorizationConfirmed: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('queues a scan for a verified authorized asset', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({ id: 'asset-id', verifiedStatus: VerificationStatus.VERIFIED }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
    });
    expect(scans.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'QUEUED' }));
    expect(scans.create.mock.calls[0]?.[0].jobs.create.map((job: { jobType: string }) => job.jobType)).toEqual([
      'HTTPS_CHECK',
      'SECURITY_HEADERS_CHECK',
      'COOKIE_SECURITY_CHECK',
      'EXPOSED_FILES_CHECK',
      'TLS_SUMMARY_CHECK',
    ]);
    expect(queue.add).toHaveBeenCalledWith('website-scan', { scanId: 'scan-id' }, { jobId: 'scan-id' });
  });

  it('checks and increments subscription usage only after scan creation succeeds', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        verifiedStatus: VerificationStatus.VERIFIED,
        project: { organizationId: 'organization-id' },
      }),
    };
    const subscriptions = {
      assertCanRunScan: vi.fn().mockResolvedValue({}),
      incrementScanUsage: vi.fn().mockResolvedValue(undefined),
      rollbackScanUsage: vi.fn().mockResolvedValue(undefined),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never, undefined, subscriptions as never);

    await service.create({ assetId: 'asset-id', scanType: ScanType.WEBSITE_BASELINE, createdBy: 'user-id', authorizationConfirmed: true });

    expect(subscriptions.assertCanRunScan).toHaveBeenCalledWith('organization-id');
    expect(subscriptions.incrementScanUsage).toHaveBeenCalledWith('organization-id', 'user-id', 'scan-id');
    expect(queue.add).toHaveBeenCalled();
  });

  it('does not create or queue a scan when the monthly limit is reached', async () => {
    const assets = { findByIdForUser: vi.fn().mockResolvedValue({ id: 'asset-id', verifiedStatus: VerificationStatus.VERIFIED, project: { organizationId: 'organization-id' } }) };
    const subscriptions = { assertCanRunScan: vi.fn().mockRejectedValue(new BadRequestException('Monthly scan limit reached.')) };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never, undefined, subscriptions as never);

    await expect(service.create({ assetId: 'asset-id', scanType: ScanType.WEBSITE_BASELINE, createdBy: 'user-id', authorizationConfirmed: true })).rejects.toThrow('Monthly scan limit reached.');
    expect(scans.create).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('adds the optional ZAP passive baseline job when requested', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({ id: 'asset-id', verifiedStatus: VerificationStatus.VERIFIED }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      includePassiveBaselineScan: true,
    });

    expect(scans.create.mock.calls[0]?.[0].jobs.create.map((job: { jobType: string }) => job.jobType)).toContain('ZAP_BASELINE_SCAN');
    expect(scans.create.mock.calls[0]?.[0].summaryJson).toMatchObject({ includePassiveBaselineScan: true });
  });

  it('queues an explicit OWASP ZAP baseline scan record', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://93.184.216.34',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'owasp_zap',
      scanMode: 'zap_baseline',
    });

    expect(scans.create.mock.calls[0]?.[0]).toMatchObject({
      scanner: 'owasp_zap',
      scanMode: 'zap_baseline',
    });
    expect(scans.create.mock.calls[0]?.[0].jobs.create).toEqual([{ jobType: 'ZAP_BASELINE_SCAN', status: 'QUEUED' }]);
  });

  it('rejects OWASP ZAP full scans without the additional confirmation', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://93.184.216.34',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'owasp_zap',
      scanMode: 'zap_full',
      fullScanConfirmed: false,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks unsafe localhost targets before queueing OWASP ZAP scans', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'http://localhost',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'owasp_zap',
      scanMode: 'zap_baseline',
    })).rejects.toMatchObject({ message: 'This target is not allowed for SaaS-hosted scanning.' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues a Nuclei safe baseline scan record', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://93.184.216.34',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'nuclei',
      scanMode: 'nuclei_safe_baseline',
    });

    expect(scans.create.mock.calls[0]?.[0]).toMatchObject({
      scanner: 'nuclei',
      scanMode: 'nuclei_safe_baseline',
    });
    expect(scans.create.mock.calls[0]?.[0].jobs.create).toEqual([{ jobType: 'NUCLEI_SAFE_BASELINE_SCAN', status: 'QUEUED' }]);
  });

  it('rejects Nuclei full scans without the additional confirmation', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://93.184.216.34',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'nuclei',
      scanMode: 'nuclei_full',
      fullScanConfirmed: false,
    })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks unsafe private IP targets before queueing Nuclei scans', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'http://192.168.1.10',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.create({
      assetId: 'asset-id',
      scanType: ScanType.WEBSITE_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      scanner: 'nuclei',
      scanMode: 'nuclei_safe_baseline',
    })).rejects.toMatchObject({ message: 'This target is not allowed for SaaS-hosted scanning.' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues a sqlmap detection scan for a scoped endpoint and parameter', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://93.184.216.34',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.createSqlmapScan({
      assetId: 'asset-id',
      scanner: 'sqlmap',
      scanMode: 'sqlmap_detection',
      targetUrl: 'https://93.184.216.34/products?id=1',
      method: 'GET',
      parameter: 'id',
      authorizationConfirmed: true,
      sqlInjectionTestConfirmed: true,
    }, 'user-id');

    expect(scans.create.mock.calls[0]?.[0]).toMatchObject({
      scanner: 'sqlmap',
      scanMode: 'sqlmap_detection',
      testedParameter: 'id',
      httpMethod: 'GET',
    });
    expect(scans.create.mock.calls[0]?.[0].jobs.create).toEqual([{ jobType: 'SQLMAP_DETECTION_SCAN', status: 'QUEUED' }]);
    expect(queue.add.mock.calls[0]?.[1].sqlmapConfig).toMatchObject({ parameter: 'id', method: 'GET' });
  });

  it('rejects sqlmap scans without SQL injection confirmation', async () => {
    const service = new ScansService(scans as unknown as ScansRepository, { findByIdForUser: vi.fn() } as unknown as AssetsRepository, queue as never);

    await expect(service.createSqlmapScan({
      assetId: 'asset-id',
      targetUrl: 'https://example.com/products?id=1',
      method: 'GET',
      parameter: 'id',
      authorizationConfirmed: true,
      sqlInjectionTestConfirmed: false,
    }, 'user-id')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects sqlmap targets outside the asset domain', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'https://example.com',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.createSqlmapScan({
      assetId: 'asset-id',
      targetUrl: 'https://93.184.216.34/products?id=1',
      method: 'GET',
      parameter: 'id',
      authorizationConfirmed: true,
      sqlInjectionTestConfirmed: true,
    }, 'user-id')).rejects.toMatchObject({ message: 'Target URL must belong to the selected asset domain.' });
  });

  it('blocks unsafe localhost targets before queueing sqlmap scans', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.WEBSITE,
        url: 'http://localhost',
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await expect(service.createSqlmapScan({
      assetId: 'asset-id',
      targetUrl: 'http://localhost/products?id=1',
      method: 'GET',
      parameter: 'id',
      authorizationConfirmed: true,
      sqlInjectionTestConfirmed: true,
    }, 'user-id')).rejects.toMatchObject({ message: 'This target is not allowed for SaaS-hosted scanning.' });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues API baseline scan jobs and encrypts the bearer token before queueing', async () => {
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.API,
        verifiedStatus: VerificationStatus.VERIFIED,
        apiSpecification: { id: 'spec-id' },
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.API_BASELINE,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      apiBearerToken: 'secret-token',
      scanScopePaths: ['GET /users'],
    });

    expect(scans.create.mock.calls[0]?.[0].jobs.create.map((job: { jobType: string }) => job.jobType)).toEqual([
      'OPENAPI_SPEC_CHECK',
      'API_SAFE_ENDPOINT_CHECK',
    ]);
    expect(scans.create.mock.calls[0]?.[0].summaryJson).toMatchObject({
      hasApiBearerToken: true,
      scanScopePaths: ['GET /users'],
    });
    expect(JSON.stringify(scans.create.mock.calls[0]?.[0].summaryJson)).not.toContain('secret-token');
    const queuedPayload = queue.add.mock.calls[0]?.[1];
    expect(queuedPayload).toMatchObject({
      scanId: 'scan-id',
      scanScopePaths: ['GET /users'],
    });
    expect(queuedPayload.apiBearerTokenCiphertext).toMatch(/^v1:/);
    expect(JSON.stringify(queuedPayload)).not.toContain('secret-token');
    expect(queue.add).toHaveBeenCalledWith('website-scan', queuedPayload, { jobId: 'scan-id' });
  });

  it('queues repository scan jobs and does not store repository tokens in scan summary', async () => {
    const zipUpload = Buffer.from('zip fixture').toString('base64');
    const assets = {
      findByIdForUser: vi.fn().mockResolvedValue({
        id: 'asset-id',
        type: AssetType.REPOSITORY,
        verifiedStatus: VerificationStatus.VERIFIED,
      }),
    };
    const service = new ScansService(scans as unknown as ScansRepository, assets as unknown as AssetsRepository, queue as never);

    await service.create({
      assetId: 'asset-id',
      scanType: ScanType.REPO_SCAN,
      createdBy: 'user-id',
      authorizationConfirmed: true,
      repositoryBranch: 'main',
      repositoryToken: 'github-token-value',
      repositoryZipBase64: zipUpload,
    });

    expect(scans.create.mock.calls[0]?.[0].jobs.create.map((job: { jobType: string }) => job.jobType)).toEqual([
      'REPOSITORY_SECURITY_SCAN',
    ]);
    expect(scans.create.mock.calls[0]?.[0].summaryJson).toMatchObject({
      repositoryBranch: 'main',
      hasRepositoryToken: true,
      hasRepositoryZipUpload: true,
    });
    expect(JSON.stringify(scans.create.mock.calls[0]?.[0].summaryJson)).not.toContain('github-token-value');
    const queuedPayload = queue.add.mock.calls[0]?.[1];
    expect(queuedPayload).toMatchObject({
      scanId: 'scan-id',
      repositoryBranch: 'main',
      repositoryZipBase64: zipUpload,
    });
    expect(queuedPayload.repositoryTokenCiphertext).toMatch(/^v1:/);
    expect(JSON.stringify(queuedPayload)).not.toContain('github-token-value');
    expect(queue.add).toHaveBeenCalledWith('website-scan', queuedPayload, { jobId: 'scan-id' });
  });
});
