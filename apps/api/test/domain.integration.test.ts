import {
  AssetType,
  FindingSeverity,
  PlanCode,
  PrismaClient,
  ReportLevel,
  RiskLevel,
  ScanStatus,
  ScanType,
  VerificationStatus,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const hasSafeTestDatabase = Boolean(databaseUrl?.toLowerCase().includes("test"));
const prisma = hasSafeTestDatabase ? new PrismaClient({ datasourceUrl: databaseUrl }) : undefined;
const describeIntegration = hasSafeTestDatabase ? describe : describe.skip;

describeIntegration("core domain persistence", () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  let userId: string;
  let organizationId: string;

  beforeAll(async () => prisma!.$connect());

  afterAll(async () => {
    if (organizationId) await prisma!.organization.delete({ where: { id: organizationId } });
    if (userId) await prisma!.user.delete({ where: { id: userId } });
    await prisma!.$disconnect();
  });

  it("persists and fetches the organization-to-finding relationship graph", async () => {
    const user = await prisma!.user.create({
      data: {
        name: "Integration User",
        email: `integration-${suffix}@luminar.example`,
        passwordHash: "integration-test-only",
      },
    });
    userId = user.id;

    const organization = await prisma!.organization.create({
      data: {
        name: "Integration Organization",
        slug: `integration-${suffix}`,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
        projects: {
          create: {
            name: "Integration Project",
            assets: {
              create: {
                type: AssetType.WEBSITE,
                name: "Integration Website",
                url: `https://${suffix}.example.com`,
                verifiedStatus: VerificationStatus.VERIFIED,
                riskLevel: RiskLevel.HIGH,
              },
            },
          },
        },
      },
      include: { projects: { include: { assets: true } } },
    });
    organizationId = organization.id;
    const asset = organization.projects[0]?.assets[0];
    expect(asset).toBeDefined();

    const scan = await prisma!.scan.create({
      data: {
        assetId: asset!.id,
        scanType: ScanType.WEBSITE_BASELINE,
        status: ScanStatus.COMPLETED,
        securityScore: 65,
        createdBy: user.id,
        findings: {
          create: {
            assetId: asset!.id,
            title: "Integration finding",
            description: "Relationship verification finding.",
            severity: FindingSeverity.HIGH,
            cvssScore: 7.5,
            category: "Integration Test",
            owaspMapping: ["A05:2021 Security Misconfiguration"],
            evidenceSummary: "Observed integration condition.",
            businessImpact: "Test impact.",
            technicalImpact: "Test technical impact.",
            remediationSummary: "Test remediation.",
            evidence: { create: { evidenceType: "TEST", observedValue: "unsafe", expectedValue: "safe" } },
            recommendations: {
              create: {
                recommendationType: "TEST",
                remediationText: "Apply test remediation.",
                retestSteps: "Repeat integration verification.",
              },
            },
          },
        },
      },
      include: { findings: { include: { evidence: true, recommendations: true } } },
    });

    expect(scan.findings).toHaveLength(1);
    expect(scan.findings[0]?.evidence).toHaveLength(1);
    expect(scan.findings[0]?.recommendations).toHaveLength(1);

    await prisma!.subscriptionPlan.create({
      data: {
        organizationId: organization.id,
        planCode: PlanCode.MAX,
        planName: "Max",
        scanLimit: 30,
        assetLimit: 100,
        monthlyScanLimit: 30,
        monthlyFixRequestLimit: 10,
        dailyScanEnabled: true,
        reportLevel: ReportLevel.DETAILED,
        validFrom: new Date(),
      },
    });
    const monthKey = new Date().toISOString().slice(0, 7);
    await prisma!.subscriptionUsage.create({
      data: { organizationId: organization.id, planCode: PlanCode.MAX, monthKey, scansUsed: 1 },
    });
    await prisma!.fixSupportRequest.create({
      data: {
        organizationId: organization.id,
        projectId: organization.projects[0]!.id,
        assetId: asset!.id,
        scanId: scan.id,
        findingId: scan.findings[0]!.id,
        requestedBy: user.id,
        subject: "Integration fix request",
        message: "Please help resolve this integration finding.",
        severity: FindingSeverity.HIGH,
      },
    });

    const fetched = await prisma!.organization.findUnique({
      where: { id: organization.id },
      include: {
        projects: { include: { assets: { include: { scans: { include: { findings: true } } } } } },
        subscriptionPlans: true,
        subscriptionUsages: true,
        fixSupportRequests: true,
      },
    });
    expect(fetched?.projects[0]?.assets[0]?.scans[0]?.findings[0]?.title).toBe("Integration finding");
    expect(fetched?.subscriptionPlans[0]).toMatchObject({ planCode: PlanCode.MAX, monthlyScanLimit: 30 });
    expect(fetched?.subscriptionUsages[0]).toMatchObject({ monthKey, scansUsed: 1 });
    expect(fetched?.fixSupportRequests[0]).toMatchObject({ findingId: scan.findings[0]!.id, requestedBy: user.id });
  });
});
