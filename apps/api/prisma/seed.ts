import {
  AssetType,
  FindingSeverity,
  FindingStatus,
  OrganizationMemberRole,
  PlanCode,
  PrismaClient,
  ReportLevel,
  ReportType,
  RiskLevel,
  ScanJobStatus,
  ScanStatus,
  ScanType,
  VerificationStatus,
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const passwordHash = await hash('User@123', 12);
  const adminPasswordHash = await hash('Admin@123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'vishal@example.com' },
    update: { name: 'Vishal Balapure', isActive: true, role: 'USER', passwordHash },
    create: {
      name: 'Vishal Balapure',
      email: 'vishal@example.com',
      passwordHash,
      role: 'USER',
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@luminarsecure.com' },
    update: { name: 'Admin User', isActive: true, role: 'ADMIN' as never, passwordHash: adminPasswordHash },
    create: {
      name: 'Admin User',
      email: 'admin@luminarsecure.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN' as never,
    },
  });

  const planDefinitions = [
    {
      code: PlanCode.PLUS,
      displayName: 'Plus',
      monthlyScanLimit: 3,
      reportLevel: ReportLevel.BASIC,
      detailedRemediation: false,
      dailyScanEnabled: false,
      monthlyFixRequestLimit: 0,
      priceMonthly: 999,
      description: 'Basic security scanning for small websites and early users.',
      features: ['3 scans per month', 'Basic report', 'Security score', 'Severity summary', 'Basic recommendations'],
    },
    {
      code: PlanCode.PRO,
      displayName: 'Pro',
      monthlyScanLimit: 10,
      reportLevel: ReportLevel.DETAILED,
      detailedRemediation: true,
      dailyScanEnabled: false,
      monthlyFixRequestLimit: 0,
      priceMonthly: 2999,
      description: 'Professional security scanning with detailed remediation guidance.',
      features: ['10 scans per month', 'Detailed technical report', 'Business and technical impact', 'Code examples', 'Retest steps', 'OWASP mapping'],
    },
    {
      code: PlanCode.MAX,
      displayName: 'Max',
      monthlyScanLimit: 30,
      reportLevel: ReportLevel.DETAILED,
      detailedRemediation: true,
      dailyScanEnabled: true,
      monthlyFixRequestLimit: 10,
      priceMonthly: 7999,
      description: 'Advanced monitoring with admin-assisted remediation support.',
      features: ['30 scans per month', 'Daily scan support', 'Detailed technical report', '10 admin fix-help requests per month'],
    },
  ];
  for (const plan of planDefinitions) {
    await prisma.planDefinition.upsert({
      where: { code: plan.code },
      update: { ...plan, currency: 'INR', isActive: true },
      create: { ...plan, currency: 'INR' },
    });
  }

  const organization = await prisma.organization.upsert({
    where: { slug: 'luminar-demo' },
    update: { name: 'LuminarIQ Demo Org', ownerId: user.id },
    create: { name: 'LuminarIQ Demo Org', slug: 'luminar-demo', ownerId: user.id },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { role: OrganizationMemberRole.OWNER },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: OrganizationMemberRole.OWNER,
    },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: adminUser.id } },
    update: { role: OrganizationMemberRole.ADMIN },
    create: {
      organizationId: organization.id,
      userId: adminUser.id,
      role: OrganizationMemberRole.ADMIN,
    },
  });

  const project = await prisma.project.upsert({
    where: { organizationId_name: { organizationId: organization.id, name: 'Corporate Website Security Review' } },
    update: { description: 'Demo website security review for the corporate marketing site.' },
    create: {
      organizationId: organization.id,
      name: 'Corporate Website Security Review',
      description: 'Demo website security review for the corporate marketing site.',
    },
  });

  const asset = await prisma.asset.upsert({
    where: { projectId_url: { projectId: project.id, url: 'https://demo.luminarsecure.com' } },
    update: { name: 'Demo Production Website', environment: 'PRODUCTION', businessCriticality: 'HIGH', riskLevel: RiskLevel.HIGH, verifiedStatus: VerificationStatus.VERIFIED },
    create: {
      projectId: project.id,
      type: AssetType.WEBSITE,
      name: 'Demo Production Website',
      url: 'https://demo.luminarsecure.com',
      environment: 'PRODUCTION',
      businessCriticality: 'HIGH',
      verifiedStatus: VerificationStatus.VERIFIED,
      riskLevel: RiskLevel.HIGH,
    },
  });

  await prisma.subscriptionPlan.deleteMany({ where: { organizationId: organization.id } });
  await prisma.subscriptionPlan.create({
    data: {
      organizationId: organization.id,
      planCode: PlanCode.MAX,
      planName: 'Max',
      status: 'ACTIVE',
      assignedBy: adminUser.id,
      scanLimit: 30,
      assetLimit: 100,
      monthlyScanLimit: 30,
      monthlyFixRequestLimit: 10,
      dailyScanEnabled: true,
      reportLevel: ReportLevel.DETAILED,
      validFrom: new Date('2026-01-01T00:00:00.000Z'),
      validTo: new Date('2027-12-31T23:59:59.000Z'),
      notes: 'Demo organization uses Max so all subscription features can be tested.',
    },
  });

  await prisma.scan.deleteMany({ where: { assetId: asset.id } });
  const scan = await prisma.scan.create({
    data: {
      assetId: asset.id,
      scanType: ScanType.WEBSITE_BASELINE,
      status: ScanStatus.COMPLETED,
      startedAt: new Date('2026-06-30T08:00:00.000Z'),
      completedAt: new Date('2026-06-30T08:02:00.000Z'),
      securityScore: 62,
      summaryJson: { critical: 1, high: 1, medium: 2, low: 1, info: 0, rating: 'Moderate' },
      createdBy: user.id,
      jobs: {
        create: {
          jobType: 'WEBSITE_BASELINE',
          status: ScanJobStatus.COMPLETED,
          attempts: 1,
          startedAt: new Date('2026-06-30T08:00:00.000Z'),
          completedAt: new Date('2026-06-30T08:02:00.000Z'),
        },
      },
      reports: {
        create: {
          organizationId: organization.id,
          projectId: project.id,
          assetId: asset.id,
          generatedBy: user.id,
          reportType: ReportType.FULL,
          title: 'Full Security Audit Report',
          securityScore: 62,
          riskRating: 'Moderate',
          reportStatus: 'COMPLETED',
          fileUrl: '/demo/reports/website-baseline.pdf',
          htmlSnapshot: '<h1>LuminarIQ SecureScan Full Security Audit Report</h1>',
        },
      },
    },
  });

  const monthKey = new Date().toISOString().slice(0, 7);
  await prisma.subscriptionUsage.upsert({
    where: { organizationId_monthKey: { organizationId: organization.id, monthKey } },
    update: { planCode: PlanCode.MAX, scansUsed: 1, fixRequestsUsed: 0, dailyScanCount: 1, lastScanDate: scan.completedAt },
    create: { organizationId: organization.id, planCode: PlanCode.MAX, monthKey, scansUsed: 1, dailyScanCount: 1, lastScanDate: scan.completedAt },
  });

  await prisma.finding.createMany({
    data: [
      {
        scanId: scan.id,
        assetId: asset.id,
        title: 'Exposed environment file detected',
        description: 'A public environment file was reachable from the website root.',
        severity: FindingSeverity.CRITICAL,
        cvssScore: 9.1,
        category: 'Exposed Sensitive Files',
        owaspMapping: ['A05:2021 Security Misconfiguration'],
        cwe: 'CWE-200',
        evidenceSummary: 'The scanner observed an accessible /.env path indicator.',
        businessImpact: 'Secrets or environment configuration exposure can lead to account takeover or data compromise.',
        technicalImpact: 'Sensitive configuration may be disclosed to unauthenticated users.',
        remediationSummary: 'Remove sensitive files from the web root and rotate any exposed secrets.',
        status: FindingStatus.OPEN,
      },
      {
        scanId: scan.id,
        assetId: asset.id,
        title: 'Cookie missing Secure flag',
        description: 'A session-like cookie was set without the Secure attribute.',
        severity: FindingSeverity.HIGH,
        cvssScore: 7.2,
        category: 'Cookie Security',
        owaspMapping: ['A02:2021 Cryptographic Failures'],
        cwe: 'CWE-614',
        evidenceSummary: 'Set-Cookie did not include Secure.',
        businessImpact: 'Session confidentiality can be weakened on mixed or downgraded connections.',
        technicalImpact: 'Cookies may be sent over non-HTTPS requests.',
        remediationSummary: 'Set Secure, HttpOnly, and SameSite attributes for sensitive cookies.',
        status: FindingStatus.OPEN,
      },
      {
        scanId: scan.id,
        assetId: asset.id,
        title: 'Missing Content Security Policy header',
        description: 'The application response does not define a Content-Security-Policy header.',
        severity: FindingSeverity.MEDIUM,
        cvssScore: 5.3,
        category: 'Security Headers',
        owaspMapping: ['A05:2021 Security Misconfiguration'],
        cwe: 'CWE-693',
        evidenceSummary: 'No Content-Security-Policy header was observed on the root response.',
        businessImpact: 'Browser-side attacks may have a larger impact if an injection flaw exists.',
        technicalImpact: 'The browser has no application-defined content loading restrictions.',
        remediationSummary: 'Deploy a tested Content Security Policy using a report-only rollout first.',
        status: FindingStatus.OPEN,
      },
      {
        scanId: scan.id,
        assetId: asset.id,
        title: 'Missing HSTS header',
        description: 'Strict-Transport-Security is not configured.',
        severity: FindingSeverity.MEDIUM,
        cvssScore: 5.0,
        category: 'Security Headers',
        owaspMapping: ['A02:2021 Cryptographic Failures'],
        cwe: 'CWE-319',
        evidenceSummary: 'No Strict-Transport-Security header was observed.',
        businessImpact: 'Users may be more exposed to downgrade or SSL stripping attacks.',
        technicalImpact: 'Browsers are not instructed to require HTTPS for future visits.',
        remediationSummary: 'Enable HSTS after confirming HTTPS works across all subdomains.',
        status: FindingStatus.OPEN,
      },
      {
        scanId: scan.id,
        assetId: asset.id,
        title: 'Server version disclosure',
        description: 'The server reveals version information in response headers.',
        severity: FindingSeverity.LOW,
        cvssScore: 2.1,
        category: 'Information Disclosure',
        owaspMapping: ['A05:2021 Security Misconfiguration'],
        cwe: 'CWE-200',
        evidenceSummary: 'Server header included product/version details.',
        businessImpact: 'Attackers can fingerprint infrastructure more easily.',
        technicalImpact: 'Version details may help target known vulnerabilities.',
        remediationSummary: 'Suppress detailed server version banners where possible.',
        status: FindingStatus.OPEN,
      },
    ],
  });

  await prisma.finding.updateMany({
    where: { scanId: scan.id, title: 'Missing Content Security Policy header' },
    data: {},
  });

  await prisma.findingEvidence.create({
    data: {
      findingId: (await prisma.finding.findFirstOrThrow({ where: { scanId: scan.id, title: 'Missing Content Security Policy header' }, select: { id: true } })).id,
      evidenceType: 'RESPONSE_HEADER',
      url: asset.url,
      observedValue: 'Header absent',
      expectedValue: 'Content-Security-Policy with reviewed directives',
      rawJson: { header: 'content-security-policy', present: false },
    },
  });
  await prisma.recommendation.create({
    data: {
      findingId: (await prisma.finding.findFirstOrThrow({ where: { scanId: scan.id, title: 'Missing Content Security Policy header' }, select: { id: true } })).id,
      recommendationType: 'CONFIGURATION',
      remediationText: 'Define a least-privilege CSP and validate it in report-only mode.',
      codeExample: "Content-Security-Policy: default-src 'self'; object-src 'none'",
      retestSteps: 'Request the asset root and confirm the reviewed CSP response header is present.',
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      action: 'DEMO_DATA_SEEDED',
      entityType: 'Organization',
      entityId: organization.id,
      metadata: { source: 'prisma-seed' },
    },
  });

  console.info(`Seeded demo organization ${organization.slug} with scan ${scan.id}.`);
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
