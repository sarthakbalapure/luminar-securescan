import { expect, test } from "@playwright/test";

const api = "http://localhost:4000";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("luminar_secure_scan_token", "test-token"));
  await page.route(`${api}/auth/me`, async (route) => route.fulfill({ json: { id: "u1", name: "Ada", email: "ada@example.com", role: "USER" } }));
  await page.route(`${api}/assets`, async (route) => route.fulfill({ json: [
    { id: "a1", name: "Portal", url: "https://portal.example.com", riskLevel: "HIGH", _count: { scans: 2, findings: 3 } },
    { id: "a2", name: "Docs", url: "https://docs.example.com", riskLevel: "LOW", _count: { scans: 1, findings: 0 } },
  ] }));
  await page.route(`${api}/scans`, async (route) => route.fulfill({ json: [
    { id: "s1", status: "COMPLETED", createdAt: "2026-07-05T00:00:00.000Z", completedAt: "2026-07-05T00:01:00.000Z", securityScore: 82, asset: { name: "Portal", url: "https://portal.example.com" }, _count: { findings: 2 } },
    { id: "s0", status: "COMPLETED", createdAt: "2026-07-04T00:00:00.000Z", completedAt: "2026-07-04T00:01:00.000Z", securityScore: 74, asset: { name: "Portal", url: "https://portal.example.com" }, _count: { findings: 3 } },
  ] }));
  await page.route(`${api}/findings`, async (route) => route.fulfill({ json: [
    { id: "f1", title: "Content Security Policy header is missing", severity: "MEDIUM", status: "OPEN", category: "Security Headers", evidenceSummary: "Missing CSP" },
    { id: "f2", title: "TLS certificate is expired", severity: "HIGH", status: "OPEN", category: "TLS", evidenceSummary: "Expired certificate" },
  ] }));
  await page.route(`${api}/reports`, async (route) => route.fulfill({ json: [{ id: "r1", reportType: "FULL", generatedAt: "2026-07-05T00:02:00.000Z" }] }));
  await page.route(`${api}/dashboard/summary`, async (route) => route.fulfill({ json: {
    securityScore: 82,
    totalAssets: 2,
    totalScans: 2,
    criticalFindings: 0,
    highFindings: 1,
    latestScanStatus: "COMPLETED",
    reportsGenerated: 1,
  } }));
  await page.route(`${api}/subscriptions/current**`, async (route) => route.fulfill({ json: {
    organizationId: "org-1",
    subscription: { id: "sub-1", planCode: "PLUS", planName: "Plus", monthlyScanLimit: 3, monthlyFixRequestLimit: 0, dailyScanEnabled: false, reportLevel: "BASIC", validFrom: "2026-01-01T00:00:00.000Z" },
    usage: { monthKey: "2026-09", scansUsed: 1, fixRequestsUsed: 0 },
    scansRemaining: 2,
    fixRequestsRemaining: 0,
    scanUsagePercent: 33,
    detailedReportsEnabled: false,
    dailyScanMessage: "Daily scanning is not available on this plan.",
  } }));
  await page.route(`${api}/scans/s1`, async (route) => route.fulfill({ json: {
    id: "s1",
    scanType: "WEBSITE_BASELINE",
    status: "COMPLETED",
    startedAt: "2026-07-05T00:00:00.000Z",
    completedAt: "2026-07-05T00:01:00.000Z",
    securityScore: 82,
    asset: { id: "a1", name: "Portal", url: "https://portal.example.com", project: { organizationId: "org-1" } },
    jobs: [{ id: "j1", jobType: "SECURITY_HEADERS_CHECK", status: "COMPLETED" }],
    reports: [],
    findings: [
      { id: "f1", title: "Content Security Policy header is missing", severity: "MEDIUM", status: "OPEN", category: "Security Headers", evidenceSummary: "Missing CSP", remediationSummary: "Add CSP" },
      { id: "f2", title: "TLS certificate is expired", severity: "HIGH", status: "FIXED", category: "TLS", evidenceSummary: "Expired certificate", remediationSummary: "Renew certificate" },
    ],
  } }));
  await page.route(`${api}/findings/f1`, async (route) => route.fulfill({ json: findingPayload("OPEN") }));
  await page.route(`${api}/findings/f1/status`, async (route) => route.fulfill({ json: findingPayload("RISK_ACCEPTED") }));
});

test("dashboard shows posture cards and top findings", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Security posture dashboard" })).toBeVisible();
  await expect(page.getByText("Latest security score")).toBeVisible();
  await expect(page.getByText("TLS certificate is expired")).toBeVisible();
  await expect(page.getByText("Recommended next actions")).toBeVisible();
});

test("scan detail filters findings", async ({ page }) => {
  await page.goto("/scans/s1");
  await expect(page.getByRole("heading", { name: "Scan results" })).toBeVisible();
  await page.getByRole("combobox").nth(0).selectOption("HIGH");
  await expect(page.getByText("TLS certificate is expired")).toBeVisible();
  await expect(page.getByText("Content Security Policy header is missing")).toBeHidden();
});

test("finding detail updates status with confirmation", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/findings/f1");
  await expect(page.getByRole("heading", { name: "Content Security Policy header is missing" })).toBeVisible();
  await page.getByRole("button", { name: "Accept risk" }).click();
  await expect(page.locator("span", { hasText: "Risk Accepted" })).toBeVisible();
});

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
    asset: { id: "a1", name: "Portal", url: "https://portal.example.com", project: { organizationId: "org-1" } },
    scan: { id: "s1" },
    evidence: [{ evidenceType: "RESPONSE_HEADER", url: "https://portal.example.com", observedValue: "missing", expectedValue: "present" }],
    recommendations: [{ recommendationType: "CONFIGURATION", remediationText: "Deploy CSP", retestSteps: "Run a new scan." }],
  };
}
