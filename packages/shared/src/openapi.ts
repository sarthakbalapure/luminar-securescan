export type OpenApiDocument = {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; version?: string };
  servers?: Array<{ url?: string }>;
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths?: Record<string, Record<string, OpenApiOperation | unknown>>;
  components?: { securitySchemes?: Record<string, unknown>; schemas?: Record<string, unknown> };
  securityDefinitions?: Record<string, unknown>;
  security?: unknown[];
};

export type OpenApiOperation = {
  operationId?: string;
  summary?: string;
  description?: string;
  security?: unknown[];
  parameters?: Array<{ name?: string; in?: string; schema?: unknown; required?: boolean }>;
  requestBody?: { content?: Record<string, { schema?: unknown }> };
  responses?: Record<string, { description?: string; headers?: Record<string, unknown>; content?: Record<string, { schema?: unknown }> }>;
  tags?: string[];
};

export type ParsedOpenApiSpec = {
  document: OpenApiDocument;
  endpoints: ParsedOpenApiEndpoint[];
  baseUrls: string[];
  title: string;
  version: string;
};

export type ParsedOpenApiEndpoint = {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  security?: unknown[];
  requestBody?: OpenApiOperation["requestBody"];
  parameters?: OpenApiOperation["parameters"];
  responses?: OpenApiOperation["responses"];
};

const httpMethods = new Set(["get", "head", "options", "post", "put", "patch", "delete", "trace"]);

export function parseOpenApiSpec(content: string): ParsedOpenApiSpec {
  const document = parseStructuredDocument(content) as OpenApiDocument;
  if (!document || typeof document !== "object" || (!document.openapi && !document.swagger)) {
    throw new Error("OpenAPI or Swagger version field is required.");
  }
  if (!document.paths || typeof document.paths !== "object") {
    throw new Error("OpenAPI paths object is required.");
  }

  const endpoints = extractOpenApiEndpoints(document);
  return {
    document,
    endpoints,
    baseUrls: extractBaseUrls(document),
    title: document.info?.title ?? "OpenAPI API",
    version: document.info?.version ?? "unknown",
  };
}

export function extractOpenApiEndpoints(document: OpenApiDocument): ParsedOpenApiEndpoint[] {
  return Object.entries(document.paths ?? {}).flatMap(([path, pathItem]) => {
    if (!pathItem || typeof pathItem !== "object") return [];
    return Object.entries(pathItem as Record<string, OpenApiOperation>)
      .filter(([method]) => httpMethods.has(method.toLowerCase()))
      .map(([method, operation]) => ({
        method: method.toUpperCase(),
        path,
        operationId: operation.operationId,
        summary: operation.summary,
        security: operation.security,
        requestBody: operation.requestBody,
        parameters: operation.parameters,
        responses: operation.responses,
      }));
  });
}

export function extractBaseUrls(document: OpenApiDocument): string[] {
  if (document.servers?.length) {
    return document.servers.map((server) => server.url).filter((url): url is string => Boolean(url));
  }
  if (document.swagger === "2.0" && document.host) {
    const scheme = document.schemes?.includes("https") ? "https" : document.schemes?.[0] ?? "https";
    return [`${scheme}://${document.host}${document.basePath ?? ""}`];
  }
  return [];
}

export function assertPublicHttpUrl(value: string, allowPrivateNetworks = false): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  if (!allowPrivateNetworks && isPrivateOrLocalHostname(url.hostname)) {
    throw new Error("Private, local, and metadata network targets are disabled by default.");
  }
  return url;
}

export function isPrivateOrLocalHostname(hostname: string) {
  const lower = hostname.toLowerCase();
  const normalizedIpv6 = lower.replace(/^\[|\]$/g, "");
  return (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.startsWith("127.") ||
    lower.startsWith("0.") ||
    lower.startsWith("10.") ||
    lower.startsWith("169.254.") ||
    lower.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower) ||
    normalizedIpv6 === "::1" ||
    normalizedIpv6.startsWith("fc") ||
    normalizedIpv6.startsWith("fd") ||
    normalizedIpv6.startsWith("fe80:")
  );
}

function parseStructuredDocument(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    return parseSimpleYaml(content);
  }
}

function parseSimpleYaml(content: string): unknown {
  const normalized = content.replace(/\t/g, "  ");
  const lines = normalized
    .split(/\r?\n/)
    .map((raw) => {
      const stripped = stripComment(raw);
      return { indent: stripped.search(/\S|$/), text: stripped.trim() };
    })
    .filter((line) => line.text);

  const root: Record<string, unknown> = {};
  const stack: Array<{ indent: number; value: Record<string, unknown> | unknown[] }> = [{ indent: -1, value: root }];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    while (stack.length > 1 && line.indent <= stack[stack.length - 1]!.indent) stack.pop();
    const parent = stack[stack.length - 1]!.value;

    if (line.text.startsWith("- ")) {
      if (!Array.isArray(parent)) throw new Error("Unsupported YAML list position.");
      const itemText = line.text.slice(2).trim();
      if (!itemText) {
        const child: Record<string, unknown> = {};
        parent.push(child);
        stack.push({ indent: line.indent, value: child });
      } else if (itemText.includes(":")) {
        const child: Record<string, unknown> = {};
        parent.push(child);
        applyKeyValue(child, itemText, line.indent, lines[index + 1]);
        stack.push({ indent: line.indent, value: child });
      } else {
        parent.push(parseScalar(itemText));
      }
      continue;
    }

    if (Array.isArray(parent)) throw new Error("Unsupported YAML mapping inside list.");
    const child = applyKeyValue(parent, line.text, line.indent, lines[index + 1]);
    if (child) stack.push(child);
  }

  return root;
}

function applyKeyValue(
  target: Record<string, unknown>,
  text: string,
  indent: number,
  nextLine?: { indent: number; text: string },
): { indent: number; value: Record<string, unknown> | unknown[] } | undefined {
  const separator = text.indexOf(":");
  if (separator < 0) throw new Error(`Unsupported YAML line: ${text}`);
  const key = unquote(text.slice(0, separator).trim());
  const rawValue = text.slice(separator + 1).trim();
  if (rawValue) {
    target[key] = parseScalar(rawValue);
    return undefined;
  }

  const value: Record<string, unknown> | unknown[] = nextLine && nextLine.indent > indent && nextLine.text.startsWith("- ") ? [] : {};
  target[key] = value;
  return { indent, value };
}

function parseScalar(value: string): unknown {
  const unquoted = unquote(value);
  if (unquoted === "true") return true;
  if (unquoted === "false") return false;
  if (unquoted === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
  if (value.startsWith("[") && value.endsWith("]")) {
    return value.slice(1, -1).split(",").map((item) => parseScalar(item.trim())).filter((item) => item !== "");
  }
  return unquoted;
}

function unquote(value: string) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function stripComment(value: string) {
  let quote: string | undefined;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && value[index - 1] !== "\\") quote = quote === char ? undefined : quote ?? char;
    if (char === "#" && !quote) return value.slice(0, index);
  }
  return value;
}
