import { afterEach, describe, expect, it, vi } from "vitest";
import { checkZapHealth, mapZapRiskToSeverity, normalizeZapAlert, runZapBaseline, runZapFull } from "./zap-baseline-scan";

describe("OWASP ZAP baseline scanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS;
  });

  it("maps ZAP risk levels to platform severities", () => {
    expect(mapZapRiskToSeverity("High")).toBe("HIGH");
    expect(mapZapRiskToSeverity("Medium")).toBe("MEDIUM");
    expect(mapZapRiskToSeverity("Low")).toBe("LOW");
    expect(mapZapRiskToSeverity("Informational")).toBe("INFO");
  });

  it("normalizes ZAP alerts into LuminarIQ findings with raw evidence", () => {
    const finding = normalizeZapAlert({
      alert: "X-Content-Type-Options Header Missing",
      risk: "Low",
      confidence: "Medium",
      description: "The anti-MIME-sniffing header was not set.",
      solution: "Set X-Content-Type-Options to nosniff.",
      url: "https://example.com/login",
      evidence: "Header missing",
      cweid: "693",
      pluginId: "10021",
    }, "https://example.com");

    expect(finding).toMatchObject({
      title: "OWASP ZAP: X-Content-Type-Options Header Missing",
      severity: "LOW",
      category: "OWASP ZAP Baseline",
      cwe: "CWE-693",
      source: "owasp_zap",
      zapRisk: "Low",
      confidence: "Medium",
    });
    expect(finding.evidence?.url).toBe("https://example.com/login");
    expect(finding.evidence?.rawJson).toMatchObject({
      scanner: "OWASP ZAP",
      mode: "PASSIVE_BASELINE",
      alert: { pluginId: "10021" },
    });
    expect(finding.recommendation?.retestSteps).toBeTruthy();
  });

  it("runs a passive baseline through mocked ZAP API responses", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/newSession/")) return json({});
      if (url.includes("/accessUrl/")) return json({});
      if (url.includes("/recordsToScan/")) return json({ recordsToScan: "0" });
      if (url.includes("/alerts/")) {
        return json({
          alerts: [
            {
              alert: "Cookie No HttpOnly Flag",
              risk: "Medium",
              confidence: "High",
              description: "A cookie was set without HttpOnly.",
              solution: "Set HttpOnly on server-managed cookies.",
              url: "https://example.com",
              evidence: "Set-Cookie missing HttpOnly",
            },
          ],
        });
      }
      return json({});
    }));

    const findings = await runZapBaseline("https://example.com", {
      apiUrl: "http://zap.local:8080",
      apiKey: "test-key",
      pollIntervalMs: 1,
      timeoutMs: 500,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "MEDIUM", category: "OWASP ZAP Baseline" });
    expect(calls.some((url) => url.includes("apikey=test-key"))).toBe(true);
    expect(calls.some((url) => url.includes("/JSON/core/action/accessUrl/"))).toBe(true);
    expect(calls.some((url) => url.includes("/JSON/core/view/alerts/"))).toBe(true);
  });

  it("runs a full scan through mocked spider and active scan responses", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("/spider/action/scan/")) return json({ scan: "spider-1" });
      if (url.includes("/spider/view/status/")) return json({ status: "100" });
      if (url.includes("/ascan/action/scan/")) return json({ scan: "active-1" });
      if (url.includes("/ascan/view/status/")) return json({ status: "100" });
      if (url.includes("/alerts/")) return json({ alerts: [{ alert: "Missing CSP", risk: "Medium", confidence: "High", url: "https://example.com" }] });
      return json({});
    }));

    const findings = await runZapFull("https://example.com", {
      apiUrl: "http://zap.local:8080",
      apiKey: "test-key",
      pollIntervalMs: 1,
      timeoutMs: 500,
    });

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ source: "owasp_zap", severity: "MEDIUM" });
    expect(calls.some((url) => url.includes("/JSON/spider/action/scan/"))).toBe(true);
    expect(calls.some((url) => url.includes("/JSON/ascan/action/scan/"))).toBe(true);
  });

  it("checks ZAP health through the version endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ version: "2.16.1" })));

    await expect(checkZapHealth({ apiUrl: "http://zap.local:8080", apiKey: "test-key" })).resolves.toEqual({
      healthy: true,
      version: "2.16.1",
    });
  });

  it("returns a clear error when a ZAP API request is aborted", async () => {
    const abortError = Object.assign(new Error("This operation was aborted"), { name: "AbortError" });
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(abortError)));

    await expect(runZapBaseline("https://example.com", {
      apiUrl: "http://zap.local:8080",
      requestTimeoutMs: 25,
      timeoutMs: 100,
    })).rejects.toThrow("OWASP ZAP API request core/newSession timed out after 25ms");
  });

  it("enforces timeout while waiting for passive records to drain", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/recordsToScan/")) return json({ recordsToScan: "4" });
      return json({});
    }));

    await expect(runZapBaseline("https://example.com", {
      apiUrl: "http://zap.local:8080",
      pollIntervalMs: 1,
      timeoutMs: 10,
    })).rejects.toThrow("timed out");
  });
});

function json(body: object) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
