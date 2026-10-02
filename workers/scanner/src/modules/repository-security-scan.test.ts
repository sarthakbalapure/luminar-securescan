import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import {
  parseGitleaksOutput,
  parseNpmAuditOutput,
  parseSemgrepOutput,
  parseTrivyOutput,
  redactSecret,
  runRepositorySecurityScan,
  type CommandRunner,
} from "./repository-security-scan";

describe("repository security scanner", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts secret-like evidence", () => {
    expect(redactSecret("GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz123456")).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(redactSecret("password = super-secret-value")).toContain("password=<redacted>");
  });

  it("parses Gitleaks output into redacted findings", () => {
    const findings = parseGitleaksOutput(JSON.stringify([
      {
        RuleID: "generic-api-key",
        Description: "API key",
        File: ".env",
        StartLine: 2,
        Secret: "abcd1234567890secretvaluewxyz",
      },
    ]), "https://github.com/acme/app");

    expect(findings[0]).toMatchObject({ severity: "HIGH", category: "Repository Security" });
    expect(findings[0]?.evidenceSummary).toContain("REDACTED");
    expect(findings[0]?.evidenceSummary).not.toContain("secretvalue");
  });

  it("parses Semgrep, Trivy, and npm audit outputs", () => {
    expect(parseSemgrepOutput(JSON.stringify({
      results: [{ check_id: "js.crypto.weak", path: "src/app.js", start: { line: 4 }, extra: { severity: "WARNING", message: "weak crypto" } }],
    }), "https://github.com/acme/app")[0]?.severity).toBe("MEDIUM");

    expect(parseTrivyOutput(JSON.stringify({
      Results: [{ Target: "Dockerfile", Misconfigurations: [{ ID: "DS001", Severity: "HIGH", Message: "runs as root" }] }],
    }), "https://github.com/acme/app")[0]?.title).toContain("Dockerfile/config security issue");

    expect(parseNpmAuditOutput(JSON.stringify({
      vulnerabilities: { lodash: { name: "lodash", severity: "high", title: "Prototype pollution", fixAvailable: true } },
    }), "https://github.com/acme/app")[0]?.severity).toBe("HIGH");
  });

  it("runs built-in checks in an isolated ZIP workspace and cleans up", async () => {
    let extractDir = "";
    const runner: CommandRunner = vi.fn(async (file, args, options) => {
      if (file === "tar" && args[0] === "-xf") {
        extractDir = String(args[3]);
        await writeFile(join(extractDir, ".env"), "API_KEY=abcd1234567890secretvaluewxyz\n");
        await writeFile(join(extractDir, "app.js"), "const h = crypto.createHash('md5');\n");
      }
      return { stdout: "", stderr: "" };
    });

    const findings = await runRepositorySecurityScan("https://github.com/acme/app", {
      scanId: "scan-id",
      scanType: "REPO_SCAN",
      repositoryZipBase64: Buffer.from("fake zip").toString("base64"),
    }, runner);

    expect(findings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
      "Environment file is present in repository scan scope",
      "Weak crypto pattern detected",
    ]));
    expect(findings.every((finding) => !finding.evidenceSummary.includes("secretvalue"))).toBe(true);
    expect(runner).toHaveBeenCalledWith("tar", expect.any(Array), expect.objectContaining({ timeout: expect.any(Number) }));
    expect(extractDir).toBeTruthy();
    expect(existsSync(extractDir)).toBe(false);
  });
});
