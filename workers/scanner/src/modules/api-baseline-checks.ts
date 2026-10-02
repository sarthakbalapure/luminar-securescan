import {
  assertPublicHttpUrl,
  extractOpenApiEndpoints,
  parseOpenApiSpec,
  type OpenApiDocument,
  type ParsedOpenApiEndpoint,
} from "@luminar-iq/shared";
import { makeFinding } from "../finding-factory";
import type { NormalizedFinding, ScannerContext, ScannerModule } from "../types";

const sensitivePathPattern = /(admin|account|user|users|profile|payment|billing|invoice|token|session|auth|password|secret|key)/i;
const sensitiveFieldPattern = /(password|passwd|token|secret|api[_-]?key|authorization|cookie|ssn|credit|card|iban|private[_-]?key)/i;
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const openApiSpecCheck: ScannerModule = {
  jobType: "OPENAPI_SPEC_CHECK",
  async run(_target: string, context?: ScannerContext) {
    const spec = getApiSpec(context);
    return analyzeOpenApiSpec(spec.document, scopedEndpoints(spec.endpoints, context?.scanScopePaths), spec.baseUrl);
  },
};

export const apiSafeEndpointCheck: ScannerModule = {
  jobType: "API_SAFE_ENDPOINT_CHECK",
  async run(_target: string, context?: ScannerContext) {
    const spec = getApiSpec(context);
    return runSafeApiEndpointChecks(spec.baseUrl, context?.apiBearerToken);
  },
};

export function analyzeOpenApiSpec(document: OpenApiDocument, endpoints: ParsedOpenApiEndpoint[], baseUrl: string): NormalizedFinding[] {
  assertPublicHttpUrl(baseUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  const findings: NormalizedFinding[] = [];
  const securitySchemes = document.components?.securitySchemes ?? document.securityDefinitions;

  if (!securitySchemes || !Object.keys(securitySchemes).length) {
    findings.push(apiFinding({
      title: "OpenAPI spec does not define security schemes",
      severity: "MEDIUM",
      affectedUrl: baseUrl,
      evidenceSummary: "No components.securitySchemes or securityDefinitions were found in the OpenAPI document.",
      remediationSummary: "Define the API authentication schemes in OpenAPI and apply them globally or per operation.",
      technicalImpact: "Consumers and scanners cannot reliably determine intended authentication requirements.",
    }));
  }

  const insecureServers = [baseUrl, ...(document.servers ?? []).map((server) => server.url ?? "")].filter((url) => url.startsWith("http://"));
  for (const server of insecureServers) {
    findings.push(apiFinding({
      title: "API server URL uses insecure HTTP",
      severity: "HIGH",
      affectedUrl: server,
      evidenceSummary: `Insecure API server URL observed: ${server}`,
      remediationSummary: "Serve API traffic over HTTPS only and redirect HTTP clients to HTTPS where compatible.",
      technicalImpact: "API requests and tokens can be intercepted or modified over plaintext HTTP.",
      cwe: "CWE-319",
      owaspMapping: ["Cryptographic Failures"],
    }));
  }

  for (const endpoint of endpoints) {
    const affectedUrl = new URL(endpoint.path.replace(/^\//, ""), ensureTrailingSlash(baseUrl)).toString();
    if (isSensitiveEndpoint(endpoint) && !hasOperationSecurity(document, endpoint)) {
      findings.push(apiFinding({
        title: "Sensitive API endpoint does not declare authentication",
        severity: "HIGH",
        affectedUrl,
        evidenceSummary: `${endpoint.method} ${endpoint.path} matched sensitive endpoint patterns without operation or global security requirements.`,
        remediationSummary: "Require authentication and authorization for sensitive endpoints and document the requirement in OpenAPI.",
        technicalImpact: "Sensitive operations may be unintentionally exposed or undocumented as unauthenticated.",
        owaspMapping: ["Broken Access Control", "Identification and Authentication Failures"],
      }));
    }

    if (unsafeMethods.has(endpoint.method)) {
      findings.push(apiFinding({
        title: "Unsafe HTTP method exposed in API specification",
        severity: isSensitiveEndpoint(endpoint) ? "MEDIUM" : "LOW",
        affectedUrl,
        evidenceSummary: `${endpoint.method} ${endpoint.path} is documented. No destructive request was sent by the scanner.`,
        remediationSummary: "Confirm the operation requires authentication, authorization, CSRF protections where browser-reachable, and idempotency safeguards where appropriate.",
        technicalImpact: "State-changing operations need explicit authorization and validation controls.",
      }));
    }

    if (hasMissingSchemaValidation(endpoint)) {
      findings.push(apiFinding({
        title: "API operation is missing schema validation indicators",
        severity: "MEDIUM",
        affectedUrl,
        evidenceSummary: `${endpoint.method} ${endpoint.path} has parameters or request bodies without explicit schemas.`,
        remediationSummary: "Define request parameter and request body schemas in OpenAPI and enforce equivalent validation in the API layer.",
        technicalImpact: "Missing schemas make validation gaps harder to detect and can increase malformed input risk.",
        owaspMapping: ["Insecure Design", "Security Misconfiguration"],
      }));
    }

    if (hasSensitiveResponseFields(endpoint)) {
      findings.push(apiFinding({
        title: "Sensitive field names appear in API response schema",
        severity: "MEDIUM",
        affectedUrl,
        evidenceSummary: `${endpoint.method} ${endpoint.path} response schema contains sensitive-looking field names.`,
        remediationSummary: "Review response DTOs and remove secrets, tokens, credentials, and unnecessary personal data from API responses.",
        technicalImpact: "Response schemas may disclose sensitive data if implemented as documented.",
        owaspMapping: ["Cryptographic Failures", "Security Misconfiguration"],
      }));
    }

    if (hasExcessiveResponseShape(endpoint)) {
      findings.push(apiFinding({
        title: "API response schema may expose excessive data",
        severity: "LOW",
        affectedUrl,
        evidenceSummary: `${endpoint.method} ${endpoint.path} returns broad object or array schemas without pagination or field constraints.`,
        remediationSummary: "Use explicit response DTOs, pagination, and least-data response shapes for collection endpoints.",
        technicalImpact: "Broad responses can increase accidental data exposure and performance risk.",
      }));
    }
  }

  if (endpoints.some((endpoint) => unsafeMethods.has(endpoint.method))) {
    findings.push(apiFinding({
      title: "Verb tampering review recommended",
      severity: "INFO",
      affectedUrl: baseUrl,
      evidenceSummary: "State-changing methods are present. The MVP scanner did not attempt verb tampering or send unsafe requests.",
      remediationSummary: "Confirm unsupported methods return 405, authorization is method-specific, and route handlers enforce expected verbs.",
      technicalImpact: "Verb tampering protections should be validated in a controlled manual or future safe automated test.",
    }));
  }

  return dedupeApiFindings(findings);
}

export async function runSafeApiEndpointChecks(baseUrl: string, bearerToken?: string): Promise<NormalizedFinding[]> {
  const url = assertPublicHttpUrl(baseUrl, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  const headers: Record<string, string> = {
    accept: "application/json,*/*;q=0.2",
    "user-agent": "LuminarIQ-SecureScan/1.0 defensive-api-baseline",
  };
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;

  const findings: NormalizedFinding[] = [];
  await delay(Number(process.env.API_SCAN_REQUEST_DELAY_MS ?? 300));
  const head = await safeFetch(url.toString(), "HEAD", headers);
  const headerBag = head.headers;
  if (!hasAnyHeader(headerBag, ["ratelimit-limit", "x-ratelimit-limit", "x-rate-limit-limit"])) {
    findings.push(apiFinding({
      title: "API response is missing rate limit headers",
      severity: "LOW",
      affectedUrl: url.toString(),
      evidenceSummary: "A safe HEAD request did not observe common rate limit headers.",
      remediationSummary: "Expose standard RateLimit or X-RateLimit headers where appropriate and enforce server-side rate limits.",
      technicalImpact: "Clients and testers cannot see rate limit posture from common response headers.",
    }));
  }

  await delay(Number(process.env.API_SCAN_REQUEST_DELAY_MS ?? 300));
  const options = await safeFetch(url.toString(), "OPTIONS", headers);
  const allowOrigin = options.headers.get("access-control-allow-origin");
  const allowCredentials = options.headers.get("access-control-allow-credentials");
  if (allowOrigin === "*" && allowCredentials?.toLowerCase() === "true") {
    findings.push(apiFinding({
      title: "API CORS policy allows wildcard origin with credentials",
      severity: "HIGH",
      affectedUrl: url.toString(),
      evidenceSummary: "OPTIONS response included Access-Control-Allow-Origin: * and Access-Control-Allow-Credentials: true.",
      remediationSummary: "Use an explicit allowlist of trusted origins and avoid wildcard origins for credentialed API requests.",
      technicalImpact: "Browsers may expose authenticated API responses to untrusted origins if CORS is misconfigured.",
      owaspMapping: ["Broken Access Control", "Security Misconfiguration"],
    }));
  }

  return findings;
}

function getApiSpec(context?: ScannerContext) {
  if (!context?.apiSpecification) throw new Error("API baseline scan requires a stored OpenAPI specification.");
  const parsed = parseOpenApiSpec(context.apiSpecification.rawContent);
  return {
    document: parsed.document,
    endpoints: extractOpenApiEndpoints(parsed.document),
    baseUrl: context.apiSpecification.baseUrl,
  };
}

function scopedEndpoints(endpoints: ParsedOpenApiEndpoint[], scope?: string[]) {
  if (!scope?.length) return endpoints;
  const selected = new Set(scope);
  return endpoints.filter((endpoint) => selected.has(`${endpoint.method} ${endpoint.path}`));
}

function hasOperationSecurity(document: OpenApiDocument, endpoint: ParsedOpenApiEndpoint) {
  if (Array.isArray(endpoint.security)) return endpoint.security.length > 0;
  return Array.isArray(document.security) && document.security.length > 0;
}

function isSensitiveEndpoint(endpoint: ParsedOpenApiEndpoint) {
  return sensitivePathPattern.test(`${endpoint.path} ${endpoint.operationId ?? ""} ${endpoint.summary ?? ""}`);
}

function hasMissingSchemaValidation(endpoint: ParsedOpenApiEndpoint) {
  const parametersMissingSchema = endpoint.parameters?.some((parameter) => !parameter.schema) ?? false;
  const requestBody = endpoint.requestBody?.content;
  const requestBodyMissingSchema = requestBody ? Object.values(requestBody).some((media) => !media.schema) : false;
  return parametersMissingSchema || requestBodyMissingSchema;
}

function hasSensitiveResponseFields(endpoint: ParsedOpenApiEndpoint) {
  return Object.values(endpoint.responses ?? {}).some((response) => sensitiveFieldPattern.test(JSON.stringify(response.content ?? {})));
}

function hasExcessiveResponseShape(endpoint: ParsedOpenApiEndpoint) {
  if (!endpoint.method.match(/GET|HEAD/)) return false;
  return Object.values(endpoint.responses ?? {}).some((response) => {
    const text = JSON.stringify(response.content ?? {}).toLowerCase();
    return text.includes('"type":"array"') && !text.includes("maxitems") && !text.includes("pagination");
  });
}

async function safeFetch(url: string, method: "HEAD" | "OPTIONS", headers: Record<string, string>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.API_SCAN_TIMEOUT_MS ?? 8000));
  try {
    return await fetch(url, {
      method,
      headers,
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function apiFinding(input: {
  title: string;
  severity: NormalizedFinding["severity"];
  affectedUrl: string;
  evidenceSummary: string;
  remediationSummary: string;
  technicalImpact: string;
  cwe?: string;
  owaspMapping?: string[];
}) {
  return makeFinding({
    title: input.title,
    description: input.technicalImpact,
    severity: input.severity,
    category: "API Security",
    affectedUrl: input.affectedUrl,
    evidenceSummary: input.evidenceSummary,
    businessImpact: "API security weaknesses can expose customer data, business workflows, or trusted integrations.",
    technicalImpact: input.technicalImpact,
    remediationSummary: input.remediationSummary,
    retestSteps: "Rerun the API baseline scan after updating the OpenAPI spec, API gateway, or service implementation.",
    cwe: input.cwe,
    owaspMapping: input.owaspMapping ?? ["API Security Misconfiguration"],
    evidenceType: "API_BASELINE",
    observedValue: input.evidenceSummary,
    expectedValue: "Documented and enforced defensive API controls",
    rawJson: { scanner: "LuminarIQ API Baseline", safeMethodsOnly: true },
    recommendationType: "API_BASELINE",
  });
}

function hasAnyHeader(headers: Headers, names: string[]) {
  return names.some((name) => headers.has(name));
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function dedupeApiFindings(findings: NormalizedFinding[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.title}|${finding.evidence?.url ?? ""}|${finding.evidenceSummary}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
