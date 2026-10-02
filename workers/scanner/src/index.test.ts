import { describe, expect, it } from "vitest";
import { analyzeCookies, analyzeHeaders, assertAllowedTarget, buildSensitiveFileUrls, calculateSecurityScore, dispatchScan, scannerJobTimeoutMs } from "./index";

describe("scanner worker safety and analyzers", () => {
  it("blocks localhost targets by default", () => {
    expect(() => assertAllowedTarget("http://localhost:3000")).toThrow("Private or local network targets");
    expect(() => assertAllowedTarget("http://169.254.169.254/latest/meta-data")).toThrow("Private or local network targets");
    expect(() => assertAllowedTarget("http://10.0.0.10")).toThrow("Private or local network targets");
    expect(() => assertAllowedTarget("http://[::1]:3000")).toThrow("Private or local network targets");
  });

  it("flags missing security headers", async () => {
    const findings = await analyzeHeaders("https://example.com", new Headers({ "x-frame-options": "DENY" }));
    expect(findings.map((finding) => finding.evidence)).toContain("Missing response header: content-security-policy");
  });

  it("flags cookies missing security attributes", () => {
    const findings = analyzeCookies(["session=abc; Path=/"]);
    expect(findings[0]?.ruleId).toBe("INSECURE_COOKIE");
  });

  it("builds sensitive file paths without changing origin", () => {
    expect(buildSensitiveFileUrls("https://example.com/app")[0]).toBe("https://example.com/.env");
  });

  it("continues a scan when one check fails", async () => {
    const updates: Array<{ model: string; data: unknown }> = [];
    const createdFindings: unknown[] = [];
    const prisma = {
      scan: {
        findUnique: async () => ({
          id: "scan-id",
          assetId: "asset-id",
          asset: { id: "asset-id", url: "https://example.com" },
          jobs: [
            { id: "job-ok", jobType: "HTTPS_CHECK" },
            { id: "job-fail", jobType: "SECURITY_HEADERS_CHECK" },
          ],
        }),
        update: async ({ data }: { data: unknown }) => updates.push({ model: "scan", data }),
      },
      scanJob: {
        update: async ({ data }: { data: unknown }) => updates.push({ model: "scanJob", data }),
      },
      finding: {
        create: async ({ data }: { data: unknown }) => createdFindings.push(data),
        findMany: async () => [],
        update: async ({ data }: { data: unknown }) => updates.push({ model: "finding", data }),
      },
    };

    await dispatchScan("scan-id", prisma as never, [
      { jobType: "HTTPS_CHECK", run: async () => [] },
      { jobType: "SECURITY_HEADERS_CHECK", run: async () => { throw new Error("boom"); } },
      { jobType: "ZAP_BASELINE_SCAN", run: async () => { throw new Error("should be skipped"); } },
    ]);

    expect(updates.some((update) => JSON.stringify(update.data).includes("FAILED"))).toBe(true);
    expect(updates.at(-1)?.data).toMatchObject({ status: "COMPLETED" });
    expect(createdFindings).toHaveLength(0);
  });

  it("calculates a preliminary score from severity weights", () => {
    expect(calculateSecurityScore([{ severity: "HIGH" } as never, { severity: "LOW" } as never])).toBe(86);
  });

  it("does not apply the short HTTP-check timeout to external scanner jobs", () => {
    expect(scannerJobTimeoutMs("HTTPS_CHECK")).toBe(8_000);
    expect(scannerJobTimeoutMs("ZAP_BASELINE_SCAN")).toBeGreaterThan(8_000);
    expect(scannerJobTimeoutMs("ZAP_FULL_SCAN")).toBeGreaterThan(scannerJobTimeoutMs("ZAP_BASELINE_SCAN"));
  });

  it("marks previous findings fixed when they are no longer detected", async () => {
    const updates: Array<{ model: string; data: unknown }> = [];
    const prisma = {
      scan: {
        findUnique: async () => ({
          id: "scan-id",
          assetId: "asset-id",
          asset: { id: "asset-id", url: "https://example.com" },
          jobs: [{ id: "job-ok", jobType: "HTTPS_CHECK" }],
        }),
        update: async ({ data }: { data: unknown }) => updates.push({ model: "scan", data }),
      },
      scanJob: {
        update: async ({ data }: { data: unknown }) => updates.push({ model: "scanJob", data }),
      },
      finding: {
        create: async () => undefined,
        findMany: async () => [{
          id: "old-finding",
          title: "Old finding",
          evidenceSummary: "Old evidence",
          evidence: [{ url: "https://example.com" }],
        }],
        update: async ({ data }: { data: unknown }) => updates.push({ model: "finding", data }),
      },
    };

    await dispatchScan("scan-id", prisma as never, [{ jobType: "HTTPS_CHECK", run: async () => [] }]);

    expect(updates).toContainEqual(expect.objectContaining({
      model: "finding",
      data: expect.objectContaining({ status: "FIXED" }),
    }));
  });
});
