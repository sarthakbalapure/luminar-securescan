import { createServer } from "http";
import type { AddressInfo } from "net";
import type { PeerCertificate } from "tls";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestUrl } from "../http-client";
import { cookieSecurityCheck } from "./cookie-security-check";
import { exposedFilesCheck } from "./exposed-files-check";
import { httpsCheck } from "./https-check";
import { securityHeadersCheck } from "./security-headers-check";
import { buildTlsFindingsFromCertificate } from "./tls-summary-check";

describe("website baseline scanner modules", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS;
  });

  it("generates a high severity HTTPS finding and records redirect evidence", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 301, headers: { location: "https://example.com/" } })));

    const findings = await httpsCheck.run("http://example.com");

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "HIGH", category: "Transport Security" });
    expect(findings[0]?.evidenceSummary).toContain("redirects to HTTPS");
    expect(findings[0]?.recommendation?.retestSteps).toBeTruthy();
  });

  it("generates header findings for missing and weak security headers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", {
      status: 200,
      headers: {
        "content-security-policy": "default-src 'self'",
        "strict-transport-security": "max-age=31536000",
      },
    })));

    const findings = await securityHeadersCheck.run("https://example.com");
    const titles = findings.map((finding) => finding.title);

    expect(titles).toContain("X-Content-Type-Options header is missing");
    expect(titles).toContain("Clickjacking protection is not explicitly configured");
    expect(findings.every((finding) => finding.remediationSummary && finding.recommendation?.retestSteps)).toBe(true);
  });

  it("generates cookie findings for missing flags, long expiry, and sensitive names", async () => {
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 800).toUTCString();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("ok", {
      status: 200,
      headers: { "set-cookie": `session=abc; Path=/; Expires=${expires}` },
    })));

    const findings = await cookieSecurityCheck.run("https://example.com");

    expect(findings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
      "Cookie session is missing secure",
      "Cookie session is missing httponly",
      "Cookie session is missing samesite",
      "Cookie session has excessive expiration",
      "Cookie session has a sensitive-looking name",
    ]));
    expect(findings.find((finding) => finding.title.includes("missing secure"))?.severity).toBe("HIGH");
  });

  it("generates critical findings for exposed .env and .git config", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/.env")) return new Response("DATABASE_URL=postgres://secret", { status: 200 });
      if (url.endsWith("/.git/config")) return new Response("[core]\nrepositoryformatversion = 0", { status: 200 });
      return new Response("", { status: 404 });
    }));

    const findings = await exposedFilesCheck.run("https://example.com");

    expect(findings).toHaveLength(2);
    expect(findings.every((finding) => finding.severity === "CRITICAL")).toBe(true);
    expect(findings.map((finding) => finding.evidence?.url)).toEqual(expect.arrayContaining([
      "https://example.com/.env",
      "https://example.com/.git/config",
    ]));
  });

  it("generates TLS findings for expired and self-signed certificates", () => {
    const cert = {
      valid_to: "Jan 01 00:00:00 2020 GMT",
      issuer: { CN: "Self Signed" },
      subject: { CN: "Self Signed" },
      subjectaltname: "DNS:example.com",
    } as PeerCertificate;

    const findings = buildTlsFindingsFromCertificate("https://example.com", new URL("https://example.com"), cert);

    expect(findings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
      "TLS certificate is expired",
      "TLS certificate appears to be self-signed",
    ]));
    expect(findings.find((finding) => finding.title.includes("expired"))?.severity).toBe("HIGH");
  });

  it("limits response body size against a local test server", async () => {
    process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS = "true";
    const server = createServer((req, res) => {
      if (req.url === "/large") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("x".repeat(10_000));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

    try {
      const port = (server.address() as AddressInfo).port;
      const response = await requestUrl(`http://127.0.0.1:${port}/large`, { maxBodyBytes: 128 });

      expect(response.bodySnippet).toHaveLength(128);
      expect(response.truncated).toBe(true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
