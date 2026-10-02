import { getTemplate } from "@luminar-iq/shared";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ScannerFinding = {
  ruleId: string;
  title: string;
  severity: string;
  evidence: string;
  recommendation: string;
  category?: string;
  affectedUrl?: string;
};

const headerRules = [
  { header: "content-security-policy", title: "Content Security Policy header is missing", severity: "Medium", expected: "Content-Security-Policy with least-privilege directives" },
  { header: "strict-transport-security", title: "HTTP Strict Transport Security header is missing", severity: "Medium", expected: "Strict-Transport-Security with an appropriate max-age" },
  { header: "x-content-type-options", title: "X-Content-Type-Options header is missing", severity: "Low", expected: "X-Content-Type-Options: nosniff" },
  { header: "referrer-policy", title: "Referrer Policy header is missing", severity: "Low", expected: "Referrer-Policy: strict-origin-when-cross-origin or stricter" },
  { header: "permissions-policy", title: "Permissions Policy header is missing", severity: "Low", expected: "Permissions-Policy limiting unused browser capabilities" },
  { header: "cross-origin-opener-policy", title: "Cross-Origin-Opener-Policy header is missing", severity: "Low", expected: "Cross-Origin-Opener-Policy: same-origin where compatible" },
  { header: "cross-origin-resource-policy", title: "Cross-Origin-Resource-Policy header is missing", severity: "Low", expected: "Cross-Origin-Resource-Policy: same-origin or same-site where compatible" },
];
const sensitivePaths = ["/.env", "/.git/config", "/config.php", "/backup.zip", "/db.sql", "/phpinfo.php", "/server-status", "/.DS_Store", "/web.config", "/robots.txt", "/sitemap.xml"];

export function assertAllowedTarget(target: string, allowPrivateNetworks = false): URL {
  const url = new URL(target);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS assets are supported.");
  }

  if (!allowPrivateNetworks && isLocalOrPrivateHost(url.hostname)) {
    throw new Error("Private or local network targets are disabled by default.");
  }

  return url;
}

export async function assertAllowedResolvedTarget(target: string, allowPrivateNetworks = false): Promise<URL> {
  const url = assertAllowedTarget(target, allowPrivateNetworks);
  if (allowPrivateNetworks) return url;
  if (process.env.NODE_ENV === "test" && process.env.SCANNER_ENFORCE_DNS_REBINDING_IN_TESTS !== "true") return url;

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) {
    if (isLocalOrPrivateHost(hostname)) throw new Error("Private or local network targets are disabled by default.");
    return url;
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (!records.length) throw new Error("Target hostname did not resolve.");
  for (const record of records) {
    if (isLocalOrPrivateHost(record.address)) {
      throw new Error("Target resolved to a private, local, or metadata network address.");
    }
  }
  return url;
}

export async function analyzeHeaders(target: string, headers: Headers): Promise<ScannerFinding[]> {
  assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");

  const findings: ScannerFinding[] = [];
  for (const rule of headerRules) {
    if (!headers.has(rule.header)) {
      const template = getTemplate("MISSING_SECURITY_HEADER");
      findings.push({
        ruleId: template.ruleId,
        title: rule.title,
        severity: rule.severity,
        evidence: `Missing response header: ${rule.header}`,
        recommendation: template.remediation,
        category: "Security Headers",
        affectedUrl: target,
      });
    }
  }

  const csp = headers.get("content-security-policy");
  if (csp && !/\bframe-ancestors\b/i.test(csp) && !headers.has("x-frame-options")) {
    findings.push({
      ruleId: "MISSING_CLICKJACKING_PROTECTION",
      title: "Clickjacking protection is not explicitly configured",
      severity: "Medium",
      evidence: "Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.",
      recommendation: "Add CSP frame-ancestors or X-Frame-Options after validating embedded-frame requirements.",
      category: "Security Headers",
      affectedUrl: target,
    });
  }

  const hsts = headers.get("strict-transport-security");
  if (hsts && !/max-age=(\d+)/i.test(hsts)) {
    findings.push({
      ruleId: "WEAK_HSTS",
      title: "Strict Transport Security header is malformed or weak",
      severity: "Medium",
      evidence: `Observed Strict-Transport-Security value: ${hsts}`,
      recommendation: "Set a valid HSTS max-age after confirming HTTPS is stable across the site.",
      category: "Security Headers",
      affectedUrl: target,
    });
  }

  return findings;
}

export function analyzeCookies(setCookieHeaders: string[]): ScannerFinding[] {
  return setCookieHeaders.flatMap((cookie) => {
    const normalized = cookie.toLowerCase();
    const template = getTemplate("INSECURE_COOKIE");
    const name = cookie.split("=")[0]?.trim() || "cookie";
    const findings: ScannerFinding[] = [];
    const missing = ["secure", "httponly", "samesite"].filter((attribute) => !normalized.includes(attribute));

    for (const attribute of missing) {
      findings.push({
        ruleId: template.ruleId,
        title: `Cookie ${name} is missing ${attribute}`,
        severity: attribute === "secure" ? "High" : attribute === "httponly" ? "Medium" : "Low",
        evidence: `Set-Cookie is missing ${attribute}: ${redactCookie(cookie)}`,
        recommendation: template.remediation,
        category: "Cookie Security",
      });
    }

    if (hasExcessiveExpiration(normalized)) {
      findings.push({
        ruleId: "EXCESSIVE_COOKIE_EXPIRATION",
        title: `Cookie ${name} has excessive expiration`,
        severity: "Low",
        evidence: `Cookie appears to persist for longer than 400 days: ${redactCookie(cookie)}`,
        recommendation: "Reduce persistent cookie lifetime to the minimum required for the business workflow.",
        category: "Cookie Security",
      });
    }

    if (/^(session|sid|token|auth|jwt|access|refresh)/i.test(name)) {
      findings.push({
        ruleId: "SENSITIVE_COOKIE_NAME",
        title: `Cookie ${name} has a sensitive-looking name`,
        severity: "Info",
        evidence: `Sensitive-looking cookie name observed: ${name}`,
        recommendation: "Avoid descriptive cookie names that reveal authentication or session implementation details.",
        category: "Cookie Security",
      });
    }

    return findings;
  });
}

export function buildSensitiveFileUrls(target: string): string[] {
  const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
  return sensitivePaths.map((path) => new URL(path, url.origin).toString());
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  const normalizedIpv6 = lower.replace(/^\[|\]$/g, "");
  return (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.startsWith("127.") ||
    lower.startsWith("0.") ||
    lower.startsWith("10.") ||
    lower.startsWith("169.254.") ||
    lower === "169.254.169.254" ||
    lower === "100.100.100.200" ||
    lower.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(lower) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower) ||
    /^192\.0\.0\./.test(lower) ||
    /^192\.0\.2\./.test(lower) ||
    /^198\.18\./.test(lower) ||
    /^198\.19\./.test(lower) ||
    /^198\.51\.100\./.test(lower) ||
    /^203\.0\.113\./.test(lower) ||
    /^22[4-9]\./.test(lower) ||
    /^23\d\./.test(lower) ||
    normalizedIpv6 === "::1" ||
    normalizedIpv6 === "::" ||
    normalizedIpv6.startsWith("fc") ||
    normalizedIpv6.startsWith("fd") ||
    normalizedIpv6.startsWith("fe80:") ||
    normalizedIpv6.startsWith("ff") ||
    normalizedIpv6.startsWith("2001:db8:")
  );
}

function redactCookie(cookie: string) {
  const [name, ...attributes] = cookie.split(";");
  return [`${name.split("=")[0]}=<redacted>`, ...attributes].join(";");
}

function hasExcessiveExpiration(normalizedCookie: string) {
  const maxAge = /max-age=(\d+)/i.exec(normalizedCookie)?.[1];
  if (maxAge && Number(maxAge) > 60 * 60 * 24 * 400) return true;

  const expires = /expires=([^;]+)/i.exec(normalizedCookie)?.[1];
  if (!expires) return false;
  const expiresAt = Date.parse(expires);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - Date.now() > 1000 * 60 * 60 * 24 * 400;
}
