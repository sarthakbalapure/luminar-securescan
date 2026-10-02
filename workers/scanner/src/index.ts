import { FindingSeverity, FindingStatus, PrismaClient, ScanJobStatus, ScanStatus } from "@prisma/client";
import { Worker } from "bullmq";
import {
  calculateSecurityScoreSummary,
  dedupeNormalizedFindings,
  issueRetestKey,
} from "./finding-normalization";
import { scannerModules } from "./modules";
import { decryptRepositoryToken, decryptSensitiveToken } from "./repository-token-crypto";
import { withTimeout } from "./scanner-utils";
import type { NormalizedFinding, ScannerContext, ScannerModule } from "./types";
export { analyzeCookies, analyzeHeaders, assertAllowedResolvedTarget, assertAllowedTarget, buildSensitiveFileUrls } from "./scanner-core";
export { requestUrl } from "./http-client";
export {
  calculateSecurityScoreSummary,
  dedupeNormalizedFindings,
  findingDedupeKey,
  mapOwasp,
  normalizeFinding,
  scoreSeverity,
} from "./finding-normalization";
export { checkZapHealth, mapZapRiskToSeverity, normalizeZapAlert, runZapBaseline, runZapFull } from "./modules/zap-baseline-scan";
export { buildNucleiCommand, checkNucleiAvailability, mapNucleiSeverity, normalizeNucleiResult, parseNucleiJsonOutput, startNucleiScan } from "./modules/nuclei-scan";
export { buildSqlmapArgs, checkSqlmapAvailability, normalizeSqlmapFinding, parseSqlmapOutput, startSqlmapDetectionScan } from "./modules/sqlmap-scan";
export { analyzeOpenApiSpec, runSafeApiEndpointChecks } from "./modules/api-baseline-checks";
export { parseGitleaksOutput, parseNpmAuditOutput, parseSemgrepOutput, parseTrivyOutput, redactSecret, runRepositorySecurityScan } from "./modules/repository-security-scan";

export const WEBSITE_SCAN_QUEUE_NAME = "website-scans";

const DEFAULT_SCANNER_JOB_TIMEOUT_MS = Number(process.env.SCANNER_CHECK_TIMEOUT_MS ?? 8_000);

/**
 * External tools need enough time to complete their own bounded workflows.
 * Keep a small buffer so their internal timeout can stop and clean up first.
 */
export function scannerJobTimeoutMs(jobType: string): number {
  const bufferMs = 15_000;
  switch (jobType) {
    case "ZAP_BASELINE_SCAN":
      return Number(process.env.ZAP_BASELINE_TIMEOUT_SECONDS ?? 300) * 1_000 + bufferMs;
    case "ZAP_FULL_SCAN":
      return Number(process.env.ZAP_FULL_SCAN_TIMEOUT_SECONDS ?? 1_800) * 1_000 + bufferMs;
    case "NUCLEI_SAFE_BASELINE_SCAN":
    case "NUCLEI_CVE_SCAN":
      return Number(process.env.NUCLEI_TIMEOUT_SECONDS ?? 600) * 1_000 + bufferMs;
    case "NUCLEI_FULL_SCAN":
      return Number(process.env.NUCLEI_FULL_SCAN_TIMEOUT_SECONDS ?? 1_800) * 1_000 + bufferMs;
    case "SQLMAP_DETECTION_SCAN":
      return Number(process.env.SQLMAP_TIMEOUT_SECONDS ?? 600) * 1_000 + bufferMs;
    case "REPOSITORY_SECURITY_SCAN":
      return Number(process.env.REPO_SCAN_TIMEOUT_MS ?? 300_000);
    default:
      return DEFAULT_SCANNER_JOB_TIMEOUT_MS;
  }
}

type PrismaLike = Pick<PrismaClient, "scan" | "scanJob" | "finding" | "auditLog">;

function connectionFromRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
  };
}

export async function dispatchScan(scanId: string, prisma: PrismaLike, modules: ScannerModule[] = scannerModules, runtime: {
  apiBearerToken?: string;
  apiBearerTokenCiphertext?: string;
  scanScopePaths?: string[];
  repositoryTokenCiphertext?: string;
  repositoryBranch?: string;
  repositoryZipBase64?: string;
  sqlmapConfig?: ScannerContext["sqlmapConfig"];
} = {}) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { asset: { include: { apiSpecification: true } }, jobs: true },
  });
  if (!scan) throw new Error(`Scan ${scanId} was not found.`);

  console.info(JSON.stringify({ event: "scan_started", scanId, assetId: scan.assetId }));
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: ScanStatus.RUNNING, startedAt: new Date() },
  });

  const findings: NormalizedFinding[] = [];
  let explicitScannerFailure: string | null = null;
  const repositoryToken = runtime.repositoryTokenCiphertext ? decryptRepositoryToken(runtime.repositoryTokenCiphertext) : undefined;
  const apiBearerToken = runtime.apiBearerTokenCiphertext ? decryptSensitiveToken(runtime.apiBearerTokenCiphertext) : runtime.apiBearerToken;
  const context: ScannerContext = {
    scanId,
    scanType: scan.scanType,
    apiBearerToken,
    scanScopePaths: runtime.scanScopePaths,
    repositoryToken,
    repositoryTokenCiphertext: runtime.repositoryTokenCiphertext,
    repositoryBranch: runtime.repositoryBranch,
    repositoryZipBase64: runtime.repositoryZipBase64,
    sqlmapConfig: runtime.sqlmapConfig ?? sqlmapConfigFromScan(scan as { targetUrl?: string | null; testedParameter?: string | null; httpMethod?: string | null }),
    apiSpecification: scan.asset.apiSpecification,
  };
  for (const module of modules) {
    const scanJob = scan.jobs.find((job) => job.jobType === module.jobType);
    if (!scanJob) continue;
    if (scanJob) {
      await prisma.scanJob.update({
        where: { id: scanJob.id },
        data: { status: ScanJobStatus.RUNNING, attempts: { increment: 1 }, startedAt: new Date() },
      });
    }

    try {
      const moduleFindings = await withTimeout(
        module.jobType,
        module.run(scan.asset.url, context),
        scannerJobTimeoutMs(module.jobType),
      );
      findings.push(...moduleFindings);
      if (scanJob) {
        await prisma.scanJob.update({
          where: { id: scanJob.id },
          data: { status: ScanJobStatus.COMPLETED, completedAt: new Date() },
        });
      }
      console.info(JSON.stringify({ event: "scan_check_completed", scanId, jobType: module.jobType, findings: moduleFindings.length }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scanner error.";
      if (((scan as { scanner?: string }).scanner === "owasp_zap" && module.jobType.startsWith("ZAP_")) || ((scan as { scanner?: string }).scanner === "nuclei" && module.jobType.startsWith("NUCLEI_")) || ((scan as { scanner?: string }).scanner === "sqlmap" && module.jobType.startsWith("SQLMAP_"))) {
        explicitScannerFailure = message;
      }
      if (scanJob) {
        await prisma.scanJob.update({
          where: { id: scanJob.id },
          data: { status: ScanJobStatus.FAILED, errorMessage: message, completedAt: new Date() },
        });
      }
      console.error(JSON.stringify({ event: "scan_check_failed", scanId, jobType: module.jobType, error: message }));
    }
  }

  if (explicitScannerFailure) {
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: ScanStatus.FAILED,
        completedAt: new Date(),
        errorMessage: explicitScannerFailure,
        summaryJson: { scannerError: explicitScannerFailure },
      } as never,
    });
    await auditScannerEvent(prisma, scanId, "ZAP_SCAN_FAILED", "NUCLEI_SCAN_FAILED", "SQLMAP_SCAN_FAILED", { error: explicitScannerFailure });
    return;
  }

  const uniqueFindings = dedupeNormalizedFindings(findings, scanId, scan.assetId);
  for (const finding of uniqueFindings) {
    await prisma.finding.create({
      data: {
        scanId,
        assetId: scan.assetId,
        title: finding.title,
        description: finding.description,
        severity: FindingSeverity[finding.severity],
        category: finding.category,
        owaspMapping: finding.owaspMapping ?? [],
        cwe: finding.cwe,
        evidenceSummary: finding.evidenceSummary,
        businessImpact: finding.businessImpact,
        technicalImpact: finding.technicalImpact,
        remediationSummary: finding.remediationSummary,
        source: finding.source ?? "internal",
        rawZapAlert: finding.rawZapAlert,
        rawNucleiResult: finding.rawNucleiResult,
        templateId: finding.templateId,
        templateName: finding.templateName,
        matcherName: finding.matcherName,
        extractedResults: finding.extractedResults ?? [],
        curlCommand: finding.curlCommand,
        nucleiSeverity: finding.nucleiSeverity,
        nucleiTags: finding.nucleiTags ?? [],
        nucleiClassification: finding.nucleiClassification,
        testedParameter: finding.testedParameter,
        injectionType: finding.injectionType,
        sqlmapRisk: finding.sqlmapRisk,
        sqlmapLevel: finding.sqlmapLevel,
        rawSqlmapSummary: finding.rawSqlmapSummary,
        zapRisk: finding.zapRisk,
        confidence: finding.confidence,
        solution: finding.solution,
        reference: finding.reference,
        cweId: finding.cweId,
        wascId: finding.wascId,
        status: FindingStatus.OPEN,
        evidence: finding.evidence ? { create: finding.evidence } : undefined,
        recommendations: finding.recommendation ? { create: finding.recommendation } : undefined,
      } as never,
    });
  }

  await markResolvedPreviousFindings(prisma, scan.assetId, scanId, uniqueFindings);
  const scoreSummary = calculateSecurityScoreSummary(uniqueFindings);
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: ScanStatus.COMPLETED,
      completedAt: new Date(),
      securityScore: scoreSummary.score,
      summaryJson: {
        critical: scoreSummary.criticalCount,
        high: scoreSummary.highCount,
        medium: scoreSummary.mediumCount,
        low: scoreSummary.lowCount,
        info: scoreSummary.infoCount,
        criticalCount: scoreSummary.criticalCount,
        highCount: scoreSummary.highCount,
        mediumCount: scoreSummary.mediumCount,
        lowCount: scoreSummary.lowCount,
        infoCount: scoreSummary.infoCount,
        totalFindings: scoreSummary.totalFindings,
        riskTrend: scoreSummary.riskTrend,
      },
    },
  });
  await auditScannerEvent(prisma, scanId, "ZAP_SCAN_COMPLETED", "NUCLEI_SCAN_COMPLETED", "SQLMAP_SCAN_COMPLETED", { importedFindings: uniqueFindings.filter((finding) => finding.source === "owasp_zap" || finding.source === "nuclei" || finding.source === "sqlmap").length });
  if (uniqueFindings.some((finding) => finding.source === "owasp_zap")) {
    await auditScannerEvent(prisma, scanId, "ZAP_FINDINGS_IMPORTED", "NUCLEI_FINDINGS_IMPORTED", "SQLMAP_FINDING_CREATED", { importedFindings: uniqueFindings.filter((finding) => finding.source === "owasp_zap").length });
  }
  if (uniqueFindings.some((finding) => finding.source === "nuclei")) {
    await auditScannerEvent(prisma, scanId, "ZAP_FINDINGS_IMPORTED", "NUCLEI_FINDINGS_IMPORTED", "SQLMAP_FINDING_CREATED", { importedFindings: uniqueFindings.filter((finding) => finding.source === "nuclei").length });
  }
  if (uniqueFindings.some((finding) => finding.source === "sqlmap")) {
    await auditScannerEvent(prisma, scanId, "ZAP_FINDINGS_IMPORTED", "NUCLEI_FINDINGS_IMPORTED", "SQLMAP_FINDING_CREATED", { importedFindings: uniqueFindings.filter((finding) => finding.source === "sqlmap").length });
  }
  console.info(JSON.stringify({ event: "scan_completed", scanId, findings: uniqueFindings.length, score: scoreSummary.score }));
}

export function calculateSecurityScore(findings: NormalizedFinding[]) {
  return calculateSecurityScoreSummary(findings).score;
}

async function markResolvedPreviousFindings(
  prisma: PrismaLike,
  assetId: string,
  scanId: string,
  currentFindings: NormalizedFinding[],
) {
  const currentKeys = new Set(currentFindings.map(issueRetestKey));
  const previousFindings = await prisma.finding.findMany({
    where: {
      assetId,
      scanId: { not: scanId },
      status: { in: [FindingStatus.OPEN, FindingStatus.IN_PROGRESS, FindingStatus.RETEST_REQUIRED] },
    },
    include: { evidence: { select: { url: true }, take: 1 } },
  });

  for (const previous of previousFindings) {
    if (!currentKeys.has(issueRetestKey(previous))) {
      await prisma.finding.update({
        where: { id: previous.id },
        data: { status: FindingStatus.FIXED, fixedAt: new Date() },
      });
    }
  }
}

export function startWorker() {
  const prisma = new PrismaClient();
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  const worker = new Worker<{
    scanId: string;
    apiBearerToken?: string;
    apiBearerTokenCiphertext?: string;
    scanScopePaths?: string[];
    repositoryTokenCiphertext?: string;
    repositoryBranch?: string;
    repositoryZipBase64?: string;
    sqlmapConfig?: ScannerContext["sqlmapConfig"];
  }>(
    WEBSITE_SCAN_QUEUE_NAME,
    async (job) => dispatchScan(job.data.scanId, prisma, scannerModules, {
      apiBearerToken: job.data.apiBearerToken,
      apiBearerTokenCiphertext: job.data.apiBearerTokenCiphertext,
      scanScopePaths: job.data.scanScopePaths,
      repositoryTokenCiphertext: job.data.repositoryTokenCiphertext,
      repositoryBranch: job.data.repositoryBranch,
      repositoryZipBase64: job.data.repositoryZipBase64,
      sqlmapConfig: job.data.sqlmapConfig,
    }),
    {
      connection: connectionFromRedisUrl(redisUrl),
      concurrency: Number(process.env.SCAN_WORKER_CONCURRENCY ?? 2),
      limiter: {
        max: Number(process.env.SCAN_WORKER_RATE_LIMIT_MAX ?? 10),
        duration: Number(process.env.SCAN_WORKER_RATE_LIMIT_DURATION_MS ?? 60_000),
      },
    }
  );

  worker.on("failed", async (job, error) => {
    const scanId = job?.data.scanId;
    console.error(JSON.stringify({ event: "scan_worker_failed", scanId, error: error.message }));
    if (scanId) {
      await prisma.scan.update({
        where: { id: scanId },
        data: { status: ScanStatus.FAILED, completedAt: new Date(), summaryJson: { workerError: error.message } },
      });
      await auditScannerEvent(prisma, scanId, "ZAP_SCAN_FAILED", "NUCLEI_SCAN_FAILED", "SQLMAP_SCAN_FAILED", { error: error.message });
    }
  });

  console.info(JSON.stringify({ event: "scanner_worker_ready", queue: WEBSITE_SCAN_QUEUE_NAME }));
  return worker;
}

async function auditScannerEvent(prisma: PrismaLike, scanId: string, zapAction: string, nucleiAction: string, sqlmapAction: string, metadata: object) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: {
      id: true,
      createdBy: true,
      scanner: true,
      scanMode: true,
      assetId: true,
      asset: { select: { url: true, project: { select: { organizationId: true } } } },
    } as never,
  }) as {
    id: string;
    createdBy: string;
    scanner?: string;
    scanMode?: string;
    assetId: string;
    asset?: { url: string; project?: { organizationId: string } };
  } | null;
  if (!scan || !["owasp_zap", "nuclei", "sqlmap"].includes(scan.scanner ?? "") || !scan.asset?.project?.organizationId) return;
  await prisma.auditLog.create({
    data: {
      organizationId: scan.asset.project.organizationId,
      userId: scan.createdBy,
      action: scan.scanner === "sqlmap" ? sqlmapAction : scan.scanner === "nuclei" ? nucleiAction : zapAction,
      entityType: "Scan",
      entityId: scan.id,
      metadata: { ...metadata, assetId: scan.assetId, targetUrl: scan.asset.url, scanMode: scan.scanMode },
    },
  });
}

function sqlmapConfigFromScan(scan: {
  targetUrl?: string | null;
  testedParameter?: string | null;
  httpMethod?: string | null;
}): ScannerContext["sqlmapConfig"] | undefined {
  if (!scan.targetUrl || !scan.testedParameter) return undefined;
  return {
    targetUrl: scan.targetUrl,
    method: scan.httpMethod === "POST" ? "POST" : "GET",
    parameter: scan.testedParameter,
  };
}

if (require.main === module) {
  startWorker();
}
