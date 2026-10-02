import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, parseOpenApiSpec } from "./openapi";

describe("OpenAPI parser", () => {
  it("parses JSON OpenAPI documents and extracts endpoints", () => {
    const parsed = parseOpenApiSpec(JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Demo API", version: "1.0" },
      servers: [{ url: "https://api.example.com" }],
      paths: {
        "/users": {
          get: { operationId: "listUsers", responses: { "200": { description: "ok" } } },
          post: { responses: { "201": { description: "created" } } },
        },
      },
    }));

    expect(parsed.title).toBe("Demo API");
    expect(parsed.baseUrls).toEqual(["https://api.example.com"]);
    expect(parsed.endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`)).toEqual(["GET /users", "POST /users"]);
  });

  it("parses common YAML OpenAPI documents", () => {
    const parsed = parseOpenApiSpec(`
openapi: 3.0.3
info:
  title: YAML API
  version: 1.0
servers:
  - url: https://api.example.com
paths:
  /health:
    get:
      summary: Health check
      responses:
        '200':
          description: ok
`);

    expect(parsed.title).toBe("YAML API");
    expect(parsed.endpoints[0]).toMatchObject({ method: "GET", path: "/health", summary: "Health check" });
  });

  it("blocks private and metadata URLs by default", () => {
    expect(() => assertPublicHttpUrl("http://169.254.169.254/latest/meta-data")).toThrow("disabled by default");
    expect(() => assertPublicHttpUrl("http://127.0.0.1:8080")).toThrow("disabled by default");
    expect(assertPublicHttpUrl("https://api.example.com").origin).toBe("https://api.example.com");
  });
});
