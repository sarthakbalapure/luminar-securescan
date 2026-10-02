import { expect, test } from "@playwright/test";

const api = "http://localhost:4000";

test.beforeEach(async ({ page }) => {
  await page.route(`${api}/auth/me`, async (route) => route.fulfill({ json: { id: "u1", name: "Ada", email: "ada@example.com", role: "USER" } }));
  await page.route(`${api}/assets`, async (route) => route.fulfill({ json: [
    { id: "a1", name: "Customer Portal", url: "https://portal.example.com", riskLevel: "MEDIUM", _count: { scans: 1, findings: 2 } },
  ] }));
  await page.route(`${api}/scans`, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { authorizationConfirmed?: boolean };
      if (!body.authorizationConfirmed) {
        await route.fulfill({ status: 400, json: { message: "Authorization confirmation is required before starting a scan." } });
        return;
      }
      await route.fulfill({ json: { id: "s1" } });
      return;
    }
    await route.fulfill({ json: [
      { id: "s1", status: "COMPLETED", createdAt: "2026-07-05T00:00:00.000Z", completedAt: "2026-07-05T00:01:00.000Z", securityScore: 82, asset: { name: "Customer Portal", url: "https://portal.example.com" }, _count: { findings: 2 } },
    ] });
  });
  await page.route(`${api}/findings`, async (route) => route.fulfill({ json: [
    { id: "f1", title: "Content Security Policy header is missing", severity: "MEDIUM", status: "OPEN", category: "Security Headers", evidenceSummary: "Missing CSP" },
  ] }));
  await page.route(`${api}/findings?assetId=a1`, async (route) => route.fulfill({ json: [
    { id: "f1", title: "Content Security Policy header is missing", severity: "MEDIUM", status: "OPEN", category: "Security Headers", evidenceSummary: "Missing CSP" },
  ] }));
  await page.route(`${api}/reports`, async (route) => route.fulfill({ json: [] }));
  await page.route(`${api}/reports/generate`, async (route) => route.fulfill({ json: {
    message: "Report generated successfully",
    report: { id: "r1", reportType: "FULL_SECURITY_AUDIT", reportStatus: "COMPLETED", generatedAt: "2026-07-05T00:02:00.000Z" },
  } }));
  await page.route(`${api}/reports/r1`, async (route) => route.fulfill({ json: {
    id: "r1",
    title: "Full Security Audit Report",
    reportType: "FULL_SECURITY_AUDIT",
    reportStatus: "COMPLETED",
    generatedAt: "2026-07-05T00:02:00.000Z",
    scan: { id: "s1", asset: { name: "Customer Portal", url: "https://portal.example.com", project: { name: "Portal", organization: { name: "LuminarIQ Demo" } } } },
  } }));
  await page.route(`${api}/reports/r1/html`, async (route) => route.fulfill({ contentType: "text/html", body: "<html><body><h1>Security Audit Report</h1></body></html>" }));
  await page.route(`${api}/dashboard/summary`, async (route) => route.fulfill({ json: {
    securityScore: 82,
    totalAssets: 1,
    totalScans: 1,
    criticalFindings: 0,
    highFindings: 0,
    latestScanStatus: "COMPLETED",
    reportsGenerated: 0,
  } }));
  await page.route(`${api}/subscriptions/current**`, async (route) => route.fulfill({ json: {
    organizationId: "org-1",
    subscription: { id: "sub-1", planCode: "MAX", planName: "Max", monthlyScanLimit: 30, monthlyFixRequestLimit: 10, dailyScanEnabled: true, reportLevel: "DETAILED", validFrom: "2026-01-01T00:00:00.000Z", validTo: "2027-12-31T23:59:59.000Z" },
    usage: { monthKey: "2026-09", scansUsed: 1, fixRequestsUsed: 0 },
    scansRemaining: 29,
    fixRequestsRemaining: 10,
    scanUsagePercent: 3,
    detailedReportsEnabled: true,
    dailyScanMessage: "Daily scan is available in Max plan. Scheduling configuration will be available soon.",
  } }));
  await page.route(`${api}/fix-requests`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { id: "request-1", status: "OPEN" } });
      return;
    }
    await route.fulfill({ json: [] });
  });
  await page.route(`${api}/projects/p1`, async (route) => route.fulfill({ json: {
    id: "p1",
    name: "Customer Portal",
    description: "Customer-facing SaaS app",
    organization: { name: "LuminarIQ Demo" },
    assets: [{ id: "a1", name: "Customer Portal", url: "https://portal.example.com", type: "WEBSITE", verifiedStatus: "VERIFIED", riskLevel: "MEDIUM" }],
  } }));
  await page.route(`${api}/assets/a1`, async (route) => route.fulfill({ json: {
    id: "a1",
    name: "Customer Portal",
    url: "https://portal.example.com",
    type: "WEBSITE",
    riskLevel: "MEDIUM",
    verifiedStatus: "VERIFIED",
    project: { id: "p1", name: "Customer Portal", organizationId: "org-1" },
  } }));
  await page.route(`${api}/scans?assetId=a1`, async (route) => route.fulfill({ json: [
    { id: "s1", status: "COMPLETED", createdAt: "2026-07-05T00:00:00.000Z", securityScore: 82, _count: { findings: 2 } },
  ] }));
  await page.route(`${api}/scans/s1/progress`, async (route) => route.fulfill({ json: scanPayload() }));
  await page.route(`${api}/scans/s1`, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { id: "r1", reportType: "FULL", generatedAt: "2026-07-05T00:02:00.000Z" } });
      return;
    }
    await route.fulfill({ json: scanPayload() });
  });
  await page.route(`${api}/scans/s1/reports`, async (route) => route.fulfill({ json: { id: "r1", reportType: "FULL", generatedAt: "2026-07-05T00:02:00.000Z" } }));
  await page.route(`${api}/reports/r1/download`, async (route) => route.fulfill({
    body: "%PDF-1.4\n% test report",
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="luminar-report.pdf"',
    },
  }));
  await page.route(`${api}/findings/f1`, async (route) => route.fulfill({ json: findingPayload("OPEN") }));
  await page.route(`${api}/findings/f1/status`, async (route) => route.fulfill({ json: findingPayload("FIXED") }));
});

test("full happy path from registration to report download", async ({ page }) => {
  await page.route(`${api}/auth/register`, async (route) => route.fulfill({ json: { accessToken: "test-token", user: { id: "u1", name: "Ada", email: "ada@example.com", role: "USER" } } }));
  await page.route("**/auth/register", async (route) => route.fulfill({ json: { accessToken: "test-token", user: { id: "u1", name: "Ada", email: "ada@example.com", role: "USER" } } }));
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Full Name").fill("Ada Lovelace");
  await page.getByLabel("Company / Organization Name").fill("Ada Labs");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill("SecurePass!123");
  await page.getByLabel("Confirm Password").fill("SecurePass!123");
  const createAccount = page.getByRole("button", { name: "Create account" });
  await createAccount.click();
  await page.waitForTimeout(300);
  if (page.url().endsWith("/register")) await createAccount.click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Security posture dashboard" })).toBeVisible();

  await page.goto("/projects/p1");
  await expect(page.getByRole("heading", { name: "Customer Portal" })).toBeVisible();
  await page.getByRole("link", { name: "Customer Portal" }).click();
  await page.getByRole("button", { name: "Start Scan" }).click();
  await page.getByText("I confirm that I own this asset or have explicit authorization to scan it.").click();
  await page.locator(".fixed").getByRole("button", { name: "Start scan" }).click();
  await expect(page).toHaveURL(/\/scans\/s1\/progress/);

  await page.goto("/scans/s1");
  await expect(page.getByRole("heading", { name: "Scan results" })).toBeVisible();
  await page.getByRole("button", { name: "Generate report" }).click();
  await page.locator(".fixed").getByRole("button", { name: "Generate Report" }).click();
  await expect(page).toHaveURL(/\/reports\/r1/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect((await download).suggestedFilename()).toBe("luminar-securescan-r1.pdf");
});

test("landing page loads with primary SaaS CTA", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Find and fix security risks before attackers do." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start Free Security Scan" }).first()).toBeVisible();
});

test("pricing page shows Plus, Pro, and Max plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Plus" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Max" })).toBeVisible();
});

test("unauthorized user sees safe error for another organization's scan", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));
  await page.route(`${api}/scans/foreign-scan`, async (route) => route.fulfill({ status: 404, json: { message: "Scan not found." } }));

  await page.goto("/scans/foreign-scan");

  await expect(page.getByText("Scan not found.")).toBeVisible();
});

test("scan start remains disabled without authorization confirmation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));
  await page.goto("/assets/a1");

  await page.getByRole("button", { name: "Start Scan" }).click();
  await expect(page.locator(".fixed").getByRole("button", { name: "Start scan" })).toBeDisabled();
});

test("finding status can be updated", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/findings/f1");
  await page.getByRole("button", { name: "Mark fixed" }).click();

  await expect(page.locator("span", { hasText: "Fixed" })).toBeVisible();
});

test("Max customer can open the admin help request form from a finding", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));
  await page.goto("/findings/f1");

  await expect(page.getByText("Fix support requests remaining this month: 10 / 10")).toBeVisible();
  await page.getByRole("button", { name: "Request Admin Help" }).click();
  await expect(page.getByRole("heading", { name: "Request Admin Help" })).toBeVisible();
  await expect(page.locator('input[value="Help needed to fix: Content Security Policy header is missing"]')).toBeVisible();
});

test("login page authenticates and redirects to dashboard", async ({ page }) => {
  await page.route(`${api}/auth/login`, async (route) => route.fulfill({ json: { accessToken: "test-token", user: { id: "u1", name: "Ada", email: "ada@example.com", role: "USER" } } }));
  await page.goto("/login");

  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password").fill("SecurePass!123");
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Security posture dashboard" })).toBeVisible();
});

test("admin login redirects to admin dashboard", async ({ page }) => {
  await page.route(`${api}/auth/admin/login`, async (route) => route.fulfill({ json: { accessToken: "admin-token", user: { id: "admin", name: "Admin User", email: "admin@luminarsecure.com", role: "ADMIN" } } }));
  await page.route(`${api}/auth/me`, async (route) => route.fulfill({ json: { id: "admin", name: "Admin User", email: "admin@luminarsecure.com", role: "ADMIN" } }));
  await page.route(`${api}/admin`, async (route) => route.fulfill({ json: {
    totalOrganizations: 1,
    totalUsers: 2,
    totalAssets: 1,
    totalScans: 1,
    scansToday: 1,
    failedScans: 0,
    criticalFindingsDetected: 0,
    reportsGenerated: 1,
    reportsGeneratedToday: 1,
    failedReportGenerations: 0,
    reportsByType: [],
    mostReportedAssets: [],
    activeSubscriptions: 1,
    plusCustomers: 0,
    proCustomers: 0,
    maxCustomers: 1,
    totalScansThisMonth: 1,
    fixRequestsOpen: 0,
    fixRequestsResolved: 0,
    organizationsNearScanLimit: 0,
    newUsersToday: 0,
    recentLogins: [],
    recentUsers: [],
    recentScans: [],
    failedScanRows: [],
    recentAuditLogs: [],
    workerQueueDepth: 0,
    queue: {},
    zapScansToday: 0,
    zapBaselineScans: 0,
    zapFullScans: 0,
    failedZapScans: 0,
    averageZapScanDurationSeconds: 0,
    nucleiScansToday: 0,
    nucleiSafeBaselineScans: 0,
    nucleiCveScans: 0,
    nucleiFullScans: 0,
    failedNucleiScans: 0,
    averageNucleiScanDurationSeconds: 0,
    sqlmapScansToday: 0,
    sqlmapFindings: 0,
    failedSqlmapScans: 0,
    averageSqlmapScanDurationSeconds: 0,
  } }));
  await page.goto("/admin/login");

  await page.getByLabel("Email").fill("admin@luminarsecure.com");
  await page.getByLabel("Password").fill("Admin@123");
  await page.getByRole("button", { name: "Sign in as Admin" }).click();

  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await expect(page.getByRole("heading", { name: "LuminarIQ SecureScan Admin" })).toBeVisible();
});

test("non-admin user cannot log in through admin portal", async ({ page }) => {
  await page.route(`${api}/auth/admin/login`, async (route) => route.fulfill({ status: 401, json: { message: "Access denied. Admin privileges required." } }));
  await page.goto("/admin/login");

  await page.getByLabel("Email").fill("vishal@example.com");
  await page.getByLabel("Password").fill("User@123");
  await page.getByRole("button", { name: "Sign in as Admin" }).click();

  await expect(page.getByText("Access denied. Admin privileges required.")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("user cannot access admin dashboard", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));

  await page.goto("/admin/dashboard");

  await expect(page.getByText("Access denied. You do not have permission to access this page.")).toBeVisible();
});

function scanPayload() {
  return {
    id: "s1",
    scanType: "WEBSITE_BASELINE",
    status: "COMPLETED",
    startedAt: "2026-07-05T00:00:00.000Z",
    completedAt: "2026-07-05T00:01:00.000Z",
    securityScore: 82,
    asset: { id: "a1", name: "Customer Portal", url: "https://portal.example.com", project: { organizationId: "org-1" } },
    jobs: [{ id: "j1", jobType: "SECURITY_HEADERS_CHECK", status: "COMPLETED" }],
    reports: [],
    findings: [{
      id: "f1",
      title: "Content Security Policy header is missing",
      severity: "MEDIUM",
      status: "OPEN",
      category: "Security Headers",
      evidenceSummary: "Missing CSP",
      remediationSummary: "Deploy a reviewed CSP.",
    }],
  };
}

function findingPayload(status: string) {
  return {
    id: "f1",
    title: "Content Security Policy header is missing",
    description: "CSP was not observed.",
    severity: "MEDIUM",
    status,
    category: "Security Headers",
    owaspMapping: ["Security Misconfiguration"],
    cwe: "CWE-693",
    evidenceSummary: "Missing content-security-policy response header.",
    businessImpact: "Browser-side attacks may have a larger blast radius.",
    technicalImpact: "No content loading policy is enforced.",
    remediationSummary: "Deploy a reviewed CSP.",
    asset: { id: "a1", name: "Customer Portal", url: "https://portal.example.com", project: { organizationId: "org-1" } },
    scan: { id: "s1" },
    evidence: [{ evidenceType: "RESPONSE_HEADER", url: "https://portal.example.com", observedValue: "missing", expectedValue: "present" }],
    recommendations: [{ recommendationType: "CONFIGURATION", remediationText: "Deploy CSP", retestSteps: "Run a new scan." }],
  };
}
