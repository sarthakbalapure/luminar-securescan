import type { NormalizedFinding } from "./types";

export type RecommendationMode = "template" | "ai-provider";
export type RecommendationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type FindingContext = {
  scannerName: string;
  title: string;
  category: string;
  severity: NormalizedFinding["severity"];
  affectedUrl: string;
  evidenceSummary: string;
  observedValue?: string;
  expectedValue?: string;
  owaspMapping?: string[];
  cwe?: string;
};

export type CodeExamples = {
  nginx?: string;
  apache?: string;
  express?: string;
  nextjs?: string;
  springBoot?: string;
};

export type RecommendationResult = {
  recommendationType: string;
  plainEnglishExplanation: string;
  businessImpact: string;
  technicalImpact: string;
  recommendedFix: string;
  codeExamples: CodeExamples;
  codeExample: string;
  retestSteps: string;
  priorityGuidance: string;
  confidence: RecommendationConfidence;
  evidenceCitations: string[];
  remediationText: string;
};

export interface RecommendationProvider {
  generateRecommendation(findingContext: FindingContext): Promise<RecommendationResult>;
}

export const AI_PROVIDER_GUARDRAILS = [
  "Do not provide offensive exploitation instructions.",
  "Do not generate payloads.",
  "Do not provide bypass steps.",
  "Only provide defensive remediation.",
  "Mention confidence level.",
  "Cite scanner evidence.",
] as const;

type TemplateDefinition = {
  id: string;
  match: (context: FindingContext, text: string) => boolean;
  build: (context: FindingContext) => Omit<RecommendationResult, "recommendationType" | "codeExample" | "remediationText" | "evidenceCitations">;
};

export class RecommendationEngine {
  constructor(
    private readonly provider: RecommendationProvider = new TemplateRecommendationProvider(),
    readonly mode: RecommendationMode = "template",
  ) {}

  static template() {
    return new RecommendationEngine(new TemplateRecommendationProvider(), "template");
  }

  static aiProviderPlaceholder() {
    return new RecommendationEngine(new PlaceholderAiRecommendationProvider(), "ai-provider");
  }

  generateRecommendation(findingContext: FindingContext) {
    return this.provider.generateRecommendation(findingContext);
  }
}

export class TemplateRecommendationProvider implements RecommendationProvider {
  async generateRecommendation(findingContext: FindingContext) {
    return generateTemplateRecommendation(findingContext);
  }
}

export class PlaceholderAiRecommendationProvider implements RecommendationProvider {
  async generateRecommendation(findingContext: FindingContext) {
    return {
      ...generateTemplateRecommendation(findingContext),
      confidence: "MEDIUM" as const,
    };
  }
}

export function generateTemplateRecommendation(context: FindingContext): RecommendationResult {
  const text = normalizeText([
    context.scannerName,
    context.title,
    context.category,
    context.evidenceSummary,
    context.affectedUrl,
    context.observedValue ?? "",
  ].join(" "));
  const template = templates.find((candidate) => candidate.match(context, text)) ?? genericTemplate;
  const result = template.build(context);
  const evidenceCitations = [
    `Scanner evidence: ${context.evidenceSummary}`,
    `Affected URL: ${context.affectedUrl}`,
  ];
  const codeExample = formatCodeExamples(result.codeExamples);

  return {
    recommendationType: template.id,
    ...result,
    codeExample,
    evidenceCitations,
    remediationText: formatRemediationText(result, evidenceCitations),
  };
}

const templates: TemplateDefinition[] = [
  {
    id: "MISSING_HTTPS",
    match: (_context, text) => includesAny(text, ["https not enforced", "uses http instead of https", "no https", "plaintext http"]),
    build: (context) => base({
      context,
      explanation: "The scanned asset was submitted over HTTP, so traffic can be observed or changed between the user and the site.",
      businessImpact: "Customers may lose trust if browsers show insecure-site warnings or if sensitive data is exposed in transit.",
      technicalImpact: "Plain HTTP does not provide transport encryption, integrity, or server identity assurance.",
      fix: "Serve the application over HTTPS, redirect all HTTP requests to HTTPS, and enable HSTS after validating the HTTPS deployment.",
      retest: "Open the affected URL with https:// and rerun the HTTPS and TLS checks. Confirm the HTTP endpoint redirects to the HTTPS URL.",
      priority: "Prioritize this before adding new browser headers because encryption is the foundation for session and data protection.",
      examples: transportExamples(),
    }),
  },
  {
    id: "HTTP_NO_HTTPS_REDIRECT",
    match: (_context, text) => includesAny(text, ["did not redirect to https", "does not redirect to https"]),
    build: (context) => base({
      context,
      explanation: "The HTTP endpoint did not consistently send users to the HTTPS version of the site.",
      businessImpact: "Users may continue browsing over an insecure channel, which can affect customer confidence and compliance posture.",
      technicalImpact: "Without a redirect, clients can remain on HTTP even when HTTPS is available.",
      fix: "Add a permanent HTTP-to-HTTPS redirect at the edge server, load balancer, or application entry point.",
      retest: "Request the http:// URL and confirm it returns a 301 or 308 redirect to the matching https:// URL.",
      priority: "Treat this as high priority for public assets that handle logins, forms, or customer data.",
      examples: redirectExamples(),
    }),
  },
  {
    id: "EXPIRED_TLS_CERTIFICATE",
    match: (_context, text) => includesAny(text, ["certificate is expired", "expired certificate", "certificate expired"]),
    build: (context) => base({
      context,
      explanation: "The server presented a TLS certificate whose validity period has already ended.",
      businessImpact: "Browsers and API clients may block access, creating an outage and training users to ignore security warnings.",
      technicalImpact: "Clients cannot rely on an expired certificate for trusted server identity.",
      fix: "Renew the certificate, deploy the renewed full chain, and verify automated renewal monitoring is active.",
      retest: "Repeat the TLS summary check and confirm the certificate expiry date is in the future.",
      priority: "Handle immediately for production systems because this can directly break customer access.",
      examples: certificateExamples(),
    }),
  },
  {
    id: "TLS_CERTIFICATE_EXPIRING_SOON",
    match: (_context, text) => includesAny(text, ["certificate expires soon", "expires in"]),
    build: (context) => base({
      context,
      explanation: "The TLS certificate is valid now but close to its expiry date.",
      businessImpact: "If renewal fails, the site can become unavailable or display browser warnings.",
      technicalImpact: "Certificate renewal automation or rotation may not be completing early enough.",
      fix: "Renew the certificate now or verify automated renewal, deployment, and alerting are working.",
      retest: "Repeat the TLS summary check after renewal and confirm the remaining validity window is healthy.",
      priority: "Schedule this before the expiry window becomes urgent; production certificates should renew automatically.",
      examples: certificateExamples(),
    }),
  },
  {
    id: "MISSING_HSTS",
    match: (_context, text) => includesAny(text, ["strict-transport-security", "hsts"]),
    build: (context) => base({
      context,
      explanation: "The response did not include a strong Strict-Transport-Security header.",
      businessImpact: "Users may be downgraded to HTTP on future visits if an attacker or network issue interferes with the first request.",
      technicalImpact: "Browsers are not instructed to automatically prefer HTTPS for this host.",
      fix: "After HTTPS is stable across the whole host, add an HSTS header with an appropriate max-age.",
      retest: "Request the HTTPS URL and confirm Strict-Transport-Security is present with a valid max-age.",
      priority: "Apply after confirming every route and subdomain in scope works over HTTPS.",
      examples: hstsExamples(),
    }),
  },
  {
    id: "MISSING_CONTENT_SECURITY_POLICY",
    match: (_context, text) =>
      !includesAny(text, ["frame-ancestors", "x-frame-options", "clickjacking"]) &&
      includesAny(text, ["content-security-policy", "content security policy", "csp"]),
    build: (context) => base({
      context,
      explanation: "The response did not include a Content-Security-Policy header to constrain browser resource loading.",
      businessImpact: "A missing CSP can increase the blast radius of content injection bugs and third-party script mistakes.",
      technicalImpact: "Browsers have fewer instructions for which script, style, frame, and connection sources are trusted.",
      fix: "Start with a report-only CSP, review violations, then enforce a least-privilege policy for the application.",
      retest: "Request the page and confirm Content-Security-Policy is present and aligned with approved application resources.",
      priority: "Prioritize pages that handle authentication, payments, administration, or sensitive user data.",
      examples: cspExamples(),
    }),
  },
  {
    id: "MISSING_FRAME_PROTECTION",
    match: (_context, text) => includesAny(text, ["x-frame-options", "frame-ancestors", "clickjacking"]),
    build: (context) => base({
      context,
      explanation: "The response did not explicitly control whether other sites can embed this page in a frame.",
      businessImpact: "Attackers may be able to trick users into clicking hidden or disguised application controls.",
      technicalImpact: "Browsers need X-Frame-Options or CSP frame-ancestors to enforce framing rules.",
      fix: "Set CSP frame-ancestors for modern browsers, or X-Frame-Options when broad legacy support is required.",
      retest: "Confirm either Content-Security-Policy contains frame-ancestors or X-Frame-Options is present.",
      priority: "Prioritize authenticated and administrative screens first.",
      examples: frameProtectionExamples(),
    }),
  },
  {
    id: "MISSING_X_CONTENT_TYPE_OPTIONS",
    match: (_context, text) => includesAny(text, ["x-content-type-options", "nosniff"]),
    build: (context) => base({
      context,
      explanation: "The response did not include X-Content-Type-Options: nosniff.",
      businessImpact: "Content handling inconsistencies can increase the impact of file upload or content-hosting mistakes.",
      technicalImpact: "Some browsers may try to infer content types instead of respecting the declared Content-Type.",
      fix: "Add X-Content-Type-Options: nosniff to application responses.",
      retest: "Request the affected URL and confirm the response includes X-Content-Type-Options: nosniff.",
      priority: "This is a low-effort hardening change and can usually ship with other header fixes.",
      examples: contentTypeOptionsExamples(),
    }),
  },
  {
    id: "MISSING_REFERRER_POLICY",
    match: (_context, text) => includesAny(text, ["referrer-policy", "referrer policy"]),
    build: (context) => base({
      context,
      explanation: "The response did not define how much referrer information browsers may send to other sites.",
      businessImpact: "URLs can contain customer identifiers, workflow state, or internal paths that should not leak to third parties.",
      technicalImpact: "Browsers fall back to their default referrer behavior, which may not match the application privacy model.",
      fix: "Set Referrer-Policy to strict-origin-when-cross-origin or a stricter value after testing analytics requirements.",
      retest: "Confirm Referrer-Policy is present on the affected response.",
      priority: "Prioritize pages whose URLs may include tenant, account, or workflow identifiers.",
      examples: referrerPolicyExamples(),
    }),
  },
  {
    id: "MISSING_PERMISSIONS_POLICY",
    match: (_context, text) => includesAny(text, ["permissions-policy", "permissions policy"]),
    build: (context) => base({
      context,
      explanation: "The response did not include a Permissions-Policy header to limit browser features.",
      businessImpact: "Unused browser capabilities may remain available to pages or embedded content without a business need.",
      technicalImpact: "The browser is not told to restrict features such as camera, microphone, geolocation, or payment APIs.",
      fix: "Add a Permissions-Policy header that denies unused capabilities and explicitly allows only required features.",
      retest: "Confirm Permissions-Policy is present and reflects the features actually used by the application.",
      priority: "Prioritize apps that embed third-party content or serve sensitive user workflows.",
      examples: permissionsPolicyExamples(),
    }),
  },
  {
    id: "COOKIE_MISSING_SECURE",
    match: (_context, text) => text.includes("cookie") && text.includes("missing secure"),
    build: (context) => base({
      context,
      explanation: "A cookie was set without the Secure attribute.",
      businessImpact: "Session or preference cookies can be exposed if a user reaches the site over HTTP.",
      technicalImpact: "Browsers may send the cookie over plaintext HTTP connections.",
      fix: "Set the Secure attribute for cookies used on HTTPS sites and ensure the application always serves HTTPS.",
      retest: "Log in or trigger the cookie-setting flow again and confirm Set-Cookie includes Secure.",
      priority: "Treat session, auth, token, and refresh cookies as urgent.",
      examples: cookieExamples("Secure"),
    }),
  },
  {
    id: "COOKIE_MISSING_HTTPONLY",
    match: (_context, text) => text.includes("cookie") && text.includes("missing httponly"),
    build: (context) => base({
      context,
      explanation: "A cookie was set without the HttpOnly attribute.",
      businessImpact: "If a browser-side script issue occurs, exposed cookies can increase account takeover risk.",
      technicalImpact: "Client-side JavaScript may be able to read the cookie value.",
      fix: "Set HttpOnly on cookies that do not need to be read by browser JavaScript.",
      retest: "Trigger the cookie-setting flow and confirm Set-Cookie includes HttpOnly for server-managed cookies.",
      priority: "Prioritize authentication and session cookies.",
      examples: cookieExamples("HttpOnly"),
    }),
  },
  {
    id: "COOKIE_MISSING_SAMESITE",
    match: (_context, text) => text.includes("cookie") && text.includes("missing samesite"),
    build: (context) => base({
      context,
      explanation: "A cookie was set without a SameSite attribute.",
      businessImpact: "Cross-site request flows may carry cookies more broadly than intended.",
      technicalImpact: "Browsers may apply defaults that differ by browser version and cookie context.",
      fix: "Set SameSite=Lax for most application cookies, or SameSite=None; Secure only when cross-site usage is required.",
      retest: "Trigger the cookie-setting flow and confirm Set-Cookie includes the chosen SameSite value.",
      priority: "Prioritize state-changing authenticated workflows.",
      examples: cookieExamples("SameSite"),
    }),
  },
  {
    id: "EXPOSED_ENV_FILE",
    match: (_context, text) => text.includes(".env"),
    build: (context) => base({
      context,
      explanation: "A public .env path appears accessible from the web.",
      businessImpact: "Environment files can contain credentials or service endpoints that would create serious incident risk.",
      technicalImpact: "Sensitive configuration may be retrievable through the public web server document root.",
      fix: "Remove the file from the web root, block dotfiles at the server layer, and rotate any secrets that may have been exposed.",
      retest: "Request /.env and confirm the server returns 403 or 404 without sensitive content.",
      priority: "Treat as critical and rotate potentially exposed secrets immediately.",
      examples: sensitiveFileExamples(),
    }),
  },
  {
    id: "EXPOSED_GIT_DIRECTORY",
    match: (_context, text) => text.includes(".git"),
    build: (context) => base({
      context,
      explanation: "A Git metadata path appears accessible from the web.",
      businessImpact: "Repository metadata can expose source structure, deployment details, and sometimes secrets committed by mistake.",
      technicalImpact: "The web server is serving version-control internals that should never be public.",
      fix: "Remove .git from the deployed artifact, block hidden paths, and review the repository for secrets that need rotation.",
      retest: "Request /.git/config and confirm the server returns 403 or 404 without repository metadata.",
      priority: "Treat as critical on public assets and review deployment packaging immediately.",
      examples: sensitiveFileExamples(),
    }),
  },
  {
    id: "EXPOSED_BACKUP_FILE",
    match: (_context, text) => includesAny(text, ["backup.zip", "db.sql", "backup file", "database dump"]),
    build: (context) => base({
      context,
      explanation: "A backup or database dump path appears accessible from the public web server.",
      businessImpact: "Backups can contain production data, credentials, or intellectual property.",
      technicalImpact: "Static file serving rules are allowing sensitive artifacts to be reached over HTTP.",
      fix: "Remove backups from the web root, store them in private storage, and block common archive and dump extensions.",
      retest: "Request the reported path and confirm it returns 403 or 404 without file content.",
      priority: "Handle urgently and investigate whether the file was accessed before removal.",
      examples: backupFileExamples(),
    }),
  },
  {
    id: "SERVER_INFORMATION_DISCLOSURE",
    match: (_context, text) => includesAny(text, ["server-status", "phpinfo", "information disclosure", "server information"]),
    build: (context) => base({
      context,
      explanation: "A diagnostic or server-information page appears reachable from the public web.",
      businessImpact: "Operational details can make incident response harder by giving attackers a clearer map of the environment.",
      technicalImpact: "The endpoint may reveal versions, modules, paths, environment settings, or runtime configuration.",
      fix: "Disable public diagnostic pages or restrict them to trusted administrative networks and authenticated staff.",
      retest: "Request the reported diagnostic path and confirm it is unavailable publicly.",
      priority: "Prioritize internet-facing production systems.",
      examples: informationDisclosureExamples(),
    }),
  },
  {
    id: "ROBOTS_TXT_SENSITIVE_PATHS",
    match: (_context, text) => text.includes("robots.txt"),
    build: (context) => base({
      context,
      explanation: "robots.txt appears to reference sensitive-looking paths.",
      businessImpact: "Even though robots.txt is not an access-control mechanism, it can draw attention to private routes or files.",
      technicalImpact: "Sensitive paths should be protected by authorization and server rules, not hidden through crawler hints.",
      fix: "Remove sensitive path hints from robots.txt and enforce access control or deny rules on the real paths.",
      retest: "Review robots.txt and request the referenced sensitive paths to confirm they are protected.",
      priority: "Prioritize paths that reference admin, staging, backup, secret, or private resources.",
      examples: robotsExamples(),
    }),
  },
];

const genericTemplate: TemplateDefinition = {
  id: "GENERAL_REMEDIATION",
  match: () => true,
  build: (context) => base({
    context,
    explanation: "The scanner observed a security-relevant condition that should be reviewed and remediated.",
    businessImpact: "The issue may increase business risk if it is reachable by users or combined with other weaknesses.",
    technicalImpact: "The observed configuration weakens the asset security posture compared with the expected state.",
    fix: "Review the scanner evidence, apply the least-privilege configuration change, and keep the change scoped to the affected asset.",
    retest: "Rerun the same baseline scan and confirm the finding is no longer detected.",
    priority: "Prioritize based on severity, exposure, and whether the affected URL supports authentication or sensitive data.",
    examples: {
      nginx: "Apply the relevant header, redirect, or deny rule in the server block for the affected host.",
      apache: "Apply the relevant Header, RewriteRule, or Require directive in the virtual host for the affected host.",
      express: "Apply the relevant Helmet middleware, redirect middleware, or route protection in the application entry point.",
    },
    confidence: "LOW",
  }),
};

function base(input: {
  context: FindingContext;
  explanation: string;
  businessImpact: string;
  technicalImpact: string;
  fix: string;
  retest: string;
  priority: string;
  examples: CodeExamples;
  confidence?: RecommendationConfidence;
}): Omit<RecommendationResult, "recommendationType" | "codeExample" | "remediationText" | "evidenceCitations"> {
  return {
    plainEnglishExplanation: input.explanation,
    businessImpact: input.businessImpact,
    technicalImpact: input.technicalImpact,
    recommendedFix: input.fix,
    codeExamples: input.examples,
    retestSteps: input.retest,
    priorityGuidance: input.priority,
    confidence: input.confidence ?? confidenceFor(input.context),
  };
}

function confidenceFor(context: FindingContext): RecommendationConfidence {
  if (context.evidenceSummary && context.affectedUrl) return "HIGH";
  if (context.evidenceSummary || context.affectedUrl) return "MEDIUM";
  return "LOW";
}

function formatRemediationText(
  result: Omit<RecommendationResult, "recommendationType" | "codeExample" | "remediationText" | "evidenceCitations">,
  evidenceCitations: string[],
) {
  return [
    `Explanation: ${result.plainEnglishExplanation}`,
    `Business impact: ${result.businessImpact}`,
    `Technical impact: ${result.technicalImpact}`,
    `Recommended fix: ${result.recommendedFix}`,
    `Priority guidance: ${result.priorityGuidance}`,
    `Confidence: ${result.confidence}`,
    ...evidenceCitations,
  ].join("\n\n");
}

function formatCodeExamples(examples: CodeExamples) {
  return Object.entries(examples)
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, example]) => `### ${labelForExample(name)}\n\`\`\`\n${example}\n\`\`\``)
    .join("\n\n");
}

function labelForExample(name: string) {
  const labels: Record<string, string> = {
    nginx: "Nginx",
    apache: "Apache",
    express: "Express.js",
    nextjs: "Next.js middleware/config",
    springBoot: "Spring Boot",
  };
  return labels[name] ?? name;
}

function transportExamples(): CodeExamples {
  return {
    ...redirectExamples(),
    springBoot: [
      "server.ssl.enabled=true",
      "server.ssl.key-store=/etc/ssl/app.p12",
      "server.ssl.key-store-password=${SSL_KEYSTORE_PASSWORD}",
    ].join("\n"),
  };
}

function redirectExamples(): CodeExamples {
  return {
    nginx: [
      "server {",
      "  listen 80;",
      "  server_name example.com;",
      "  return 308 https://$host$request_uri;",
      "}",
    ].join("\n"),
    apache: [
      "<VirtualHost *:80>",
      "  ServerName example.com",
      "  RewriteEngine On",
      "  RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=308,L]",
      "</VirtualHost>",
    ].join("\n"),
    express: [
      "app.use((req, res, next) => {",
      "  if (req.secure || req.headers[\"x-forwarded-proto\"] === \"https\") return next();",
      "  return res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);",
      "});",
    ].join("\n"),
    nextjs: [
      "import { NextResponse } from \"next/server\";",
      "export function middleware(request) {",
      "  if (request.headers.get(\"x-forwarded-proto\") === \"http\") {",
      "    const url = request.nextUrl.clone();",
      "    url.protocol = \"https:\";",
      "    return NextResponse.redirect(url, 308);",
      "  }",
      "  return NextResponse.next();",
      "}",
    ].join("\n"),
  };
}

function hstsExamples(): CodeExamples {
  return headerExamples("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

function cspExamples(): CodeExamples {
  return headerExamples("Content-Security-Policy", "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'");
}

function frameProtectionExamples(): CodeExamples {
  return {
    ...headerExamples("Content-Security-Policy", "frame-ancestors 'self'"),
    apache: "Header always set X-Frame-Options \"SAMEORIGIN\"",
  };
}

function contentTypeOptionsExamples(): CodeExamples {
  return headerExamples("X-Content-Type-Options", "nosniff");
}

function referrerPolicyExamples(): CodeExamples {
  return headerExamples("Referrer-Policy", "strict-origin-when-cross-origin");
}

function permissionsPolicyExamples(): CodeExamples {
  return headerExamples("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function headerExamples(header: string, value: string): CodeExamples {
  return {
    nginx: `add_header ${header} "${value}" always;`,
    apache: `Header always set ${header} "${value}"`,
    express: [
      "app.use((_req, res, next) => {",
      `  res.setHeader("${header}", "${value}");`,
      "  next();",
      "});",
    ].join("\n"),
    nextjs: [
      "export async function headers() {",
      "  return [{",
      "    source: \"/(.*)\",",
      `    headers: [{ key: "${header}", value: "${value}" }],`,
      "  }];",
      "}",
    ].join("\n"),
    springBoot: [
      "@Bean",
      "SecurityFilterChain security(HttpSecurity http) throws Exception {",
      "  return http.headers(headers -> headers",
      `    .addHeaderWriter(new StaticHeadersWriter("${header}", "${value}")))`,
      "    .build();",
      "}",
    ].join("\n"),
  };
}

function cookieExamples(attribute: "Secure" | "HttpOnly" | "SameSite"): CodeExamples {
  const sameSiteValue = attribute === "SameSite" ? "lax" : undefined;
  return {
    nginx: "proxy_cookie_path / \"/; Secure; HttpOnly; SameSite=Lax\";",
    apache: "Header edit* Set-Cookie \"^(.*)$\" \"$1; Secure; HttpOnly; SameSite=Lax\"",
    express: [
      "res.cookie(\"session\", value, {",
      "  secure: true,",
      "  httpOnly: true,",
      `  sameSite: ${sameSiteValue ? `"${sameSiteValue}"` : "\"lax\""},`,
      "});",
    ].join("\n"),
    nextjs: [
      "response.cookies.set(\"session\", value, {",
      "  secure: true,",
      "  httpOnly: true,",
      `  sameSite: ${sameSiteValue ? `"${sameSiteValue}"` : "\"lax\""},`,
      "});",
    ].join("\n"),
    springBoot: [
      "server.servlet.session.cookie.secure=true",
      "server.servlet.session.cookie.http-only=true",
      "server.servlet.session.cookie.same-site=lax",
    ].join("\n"),
  };
}

function sensitiveFileExamples(): CodeExamples {
  return {
    nginx: [
      "location ~ /\\.(?!well-known) {",
      "  deny all;",
      "}",
    ].join("\n"),
    apache: [
      "<FilesMatch \"^\\.\">",
      "  Require all denied",
      "</FilesMatch>",
    ].join("\n"),
    express: [
      "app.use((req, res, next) => {",
      "  if (req.path.startsWith(\"/.\") || req.path.includes(\"/.git\")) return res.sendStatus(404);",
      "  return next();",
      "});",
    ].join("\n"),
    nextjs: [
      "export const config = { matcher: [\"/((?!_next/static|_next/image|favicon.ico).*)\"] };",
      "export function middleware(request) {",
      "  if (request.nextUrl.pathname.startsWith(\"/.\")) return new Response(null, { status: 404 });",
      "}",
    ].join("\n"),
  };
}

function backupFileExamples(): CodeExamples {
  return {
    nginx: [
      "location ~* \\.(zip|tar|gz|sql|bak|backup)$ {",
      "  deny all;",
      "}",
    ].join("\n"),
    apache: [
      "<FilesMatch \"\\.(zip|tar|gz|sql|bak|backup)$\">",
      "  Require all denied",
      "</FilesMatch>",
    ].join("\n"),
    express: [
      "app.use((req, res, next) => {",
      "  if (/\\.(zip|tar|gz|sql|bak|backup)$/i.test(req.path)) return res.sendStatus(404);",
      "  return next();",
      "});",
    ].join("\n"),
  };
}

function informationDisclosureExamples(): CodeExamples {
  return {
    nginx: [
      "location = /server-status {",
      "  return 404;",
      "}",
    ].join("\n"),
    apache: [
      "<Location \"/server-status\">",
      "  Require ip 10.0.0.0/8",
      "</Location>",
    ].join("\n"),
    express: [
      "app.disable(\"x-powered-by\");",
      "app.get(\"/server-status\", (_req, res) => res.sendStatus(404));",
    ].join("\n"),
    springBoot: [
      "management.endpoints.web.exposure.include=health,info",
      "server.error.include-stacktrace=never",
    ].join("\n"),
  };
}

function robotsExamples(): CodeExamples {
  return {
    nginx: "location = /robots.txt { try_files /robots.txt =404; }",
    apache: "Alias /robots.txt /var/www/public/robots.txt",
    express: [
      "app.get(\"/robots.txt\", (_req, res) => {",
      "  res.type(\"text/plain\").send(\"User-agent: *\\nAllow: /\\n\");",
      "});",
    ].join("\n"),
  };
}

function certificateExamples(): CodeExamples {
  return {
    nginx: [
      "ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;",
      "ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;",
    ].join("\n"),
    apache: [
      "SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem",
      "SSLCertificateKeyFile /etc/letsencrypt/live/example.com/privkey.pem",
    ].join("\n"),
    springBoot: [
      "server.ssl.key-store=/etc/ssl/app.p12",
      "server.ssl.key-store-type=PKCS12",
      "server.ssl.key-store-password=${SSL_KEYSTORE_PASSWORD}",
    ].join("\n"),
  };
}

function includesAny(text: string, parts: string[]) {
  return parts.some((part) => text.includes(part));
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ");
}
