import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildNucleiCommand, mapNucleiSeverity, normalizeNucleiResult, parseNucleiJsonOutput } from "./nuclei-scan";

describe("Nuclei scanner integration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps Nuclei severity levels to platform severities", () => {
    expect(mapNucleiSeverity("critical")).toBe("CRITICAL");
    expect(mapNucleiSeverity("high")).toBe("HIGH");
    expect(mapNucleiSeverity("medium")).toBe("MEDIUM");
    expect(mapNucleiSeverity("low")).toBe("LOW");
    expect(mapNucleiSeverity("unknown")).toBe("INFO");
  });

  it("builds safe argument-array commands without shell strings", () => {
    vi.stubEnv("NUCLEI_RATE_LIMIT", "5");
    vi.stubEnv("NUCLEI_CONCURRENCY", "5");
    const args = buildNucleiCommand("https://example.com", "nuclei_cve", "out.jsonl");

    expect(args).toContain("-u");
    expect(args).toContain("https://example.com");
    expect(args).toContain("-jsonl");
    expect(args).toContain("-tags");
    expect(args).toContain("cve");
    expect(args.join(" ")).not.toContain(";");
  });

  it("parses Nuclei JSONL output", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "nuclei-test-"));
    const file = path.join(dir, "result.jsonl");
    await writeFile(file, `${JSON.stringify({ "template-id": "http/misconfig/missing-header", info: { name: "Missing Security Header", severity: "medium" } })}\n`);
    try {
      await expect(parseNucleiJsonOutput(file)).resolves.toHaveLength(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("normalizes Nuclei results into LuminarIQ findings with sanitized metadata", () => {
    const finding = normalizeNucleiResult({
      "template-id": "http/exposures/config",
      "matcher-name": "body",
      "matched-at": "https://example.com/.env",
      "curl-command": "curl https://example.com/.env?token=secret",
      "extracted-results": ["api_key=secret-value"],
      info: {
        name: "Exposed Configuration File",
        severity: "high",
        tags: ["exposure", "config"],
        remediation: "Remove exposed configuration files.",
        classification: { "cwe-id": "538", "cvss-score": 8.1 },
      },
    }, "https://example.com");

    expect(finding).toMatchObject({
      source: "nuclei",
      severity: "HIGH",
      templateId: "http/exposures/config",
      templateName: "Exposed Configuration File",
      cwe: "CWE-538",
    });
    expect(finding.rawNucleiResult).not.toHaveProperty("curl-command");
    expect(finding.extractedResults?.[0]).toContain("<redacted>");
  });
});
