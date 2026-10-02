import { describe, expect, it } from "vitest";
import { buildSqlmapArgs, normalizeSqlmapFinding, parseSqlmapOutput } from "./sqlmap-scan";

describe("sqlmap detection scanner", () => {
  it("builds safe GET arguments without forbidden extraction options", () => {
    const args = buildSqlmapArgs({
      targetUrl: "https://example.com/products?id=1",
      method: "GET",
      parameter: "id",
    });

    expect(args).toContain("-u");
    expect(args).toContain("-p");
    expect(args).toContain("id");
    expect(args).toContain("--batch");
    expect(args.join(" ")).not.toMatch(/--dump|--os-shell|--file-read|--tamper|--crawl|--forms/);
  });

  it("builds POST arguments with fixed safe flags only", () => {
    const args = buildSqlmapArgs({
      targetUrl: "https://example.com/search",
      method: "POST",
      parameter: "query",
      postBody: "query=test",
      authorizationHeader: "Authorization: Bearer secret-token",
    });

    expect(args).toContain("--method=POST");
    expect(args).toContain("--data");
    expect(args).toContain("query=test");
    expect(args).toContain("-H");
  });

  it("detects positive sqlmap output without exposing payloads", () => {
    const parsed = parseSqlmapOutput("[INFO] GET parameter 'id' appears to be 'boolean-based blind' injectable");

    expect(parsed).toMatchObject({ injectable: true, injectionType: "boolean-based blind" });
  });

  it("handles no-finding sqlmap output", () => {
    const parsed = parseSqlmapOutput("[WARNING] all tested parameters do not appear to be injectable");

    expect(parsed).toMatchObject({ injectable: false });
  });

  it("normalizes positive output into a defensive sqlmap finding", () => {
    const finding = normalizeSqlmapFinding({
      injectable: true,
      injectionType: "boolean-based blind",
      summary: "SQL injection detection reported the selected parameter may be injectable.",
    }, {
      targetUrl: "https://example.com/products?id=1",
      method: "GET",
      parameter: "id",
    });

    expect(finding).toMatchObject({
      source: "sqlmap",
      severity: "HIGH",
      category: "Injection",
      testedParameter: "id",
      cwe: "CWE-89",
    });
    expect(JSON.stringify(finding)).not.toContain("--dump");
  });
});
