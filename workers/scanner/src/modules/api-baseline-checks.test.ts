import { afterEach, describe, expect, it, vi } from "vitest";
import { parseOpenApiSpec } from "@luminar-iq/shared";
import { analyzeOpenApiSpec, runSafeApiEndpointChecks } from "./api-baseline-checks";

const spec = JSON.stringify({
  openapi: "3.0.3",
  info: { title: "Demo API", version: "1.0" },
  servers: [{ url: "http://api.example.com" }],
  paths: {
    "/users": {
      get: {
        summary: "List users",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      passwordHash: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/admin/users/{id}": {
      delete: {
        parameters: [{ name: "id", in: "path", required: true }],
        responses: { "204": { description: "deleted" } },
      },
    },
  },
});

describe("API baseline checks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("generates findings from OpenAPI spec analysis", () => {
    const parsed = parseOpenApiSpec(spec);
    const findings = analyzeOpenApiSpec(parsed.document, parsed.endpoints, "https://api.example.com");
    const titles = findings.map((finding) => finding.title);

    expect(titles).toContain("OpenAPI spec does not define security schemes");
    expect(titles).toContain("Sensitive API endpoint does not declare authentication");
    expect(titles).toContain("Unsafe HTTP method exposed in API specification");
    expect(titles).toContain("API operation is missing schema validation indicators");
    expect(titles).toContain("Sensitive field names appear in API response schema");
    expect(titles).toContain("API response schema may expose excessive data");
    expect(titles).toContain("Verb tampering review recommended");
    expect(findings.every((finding) => finding.evidence?.rawJson)).toBe(true);
  });

  it("uses only safe methods for runtime API checks and imports CORS/rate limit findings", async () => {
    const methods: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      methods.push(String(init?.method));
      if (init?.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-credentials": "true",
          },
        });
      }
      return new Response("", { status: 200 });
    }));

    const findings = await runSafeApiEndpointChecks("https://api.example.com", "token");

    expect(methods).toEqual(["HEAD", "OPTIONS"]);
    expect(findings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
      "API response is missing rate limit headers",
      "API CORS policy allows wildcard origin with credentials",
    ]));
  });
});
