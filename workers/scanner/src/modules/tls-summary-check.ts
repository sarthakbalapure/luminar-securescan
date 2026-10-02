import { checkServerIdentity, connect, type PeerCertificate } from "tls";
import { makeFinding } from "../finding-factory";
import { assertAllowedTarget } from "../scanner-core";
import { withTimeout } from "../scanner-utils";
import type { NormalizedFinding, ScannerModule } from "../types";

export const tlsSummaryCheck: ScannerModule = {
  jobType: "TLS_SUMMARY_CHECK",
  async run(target: string): Promise<NormalizedFinding[]> {
    const url = assertAllowedTarget(target, process.env.SCANNER_ALLOWED_PRIVATE_NETWORKS === "true");
    if (url.protocol !== "https:") {
      return [makeFinding({
        title: "TLS is not available on the submitted asset URL",
        description: "The scan target was submitted with a plaintext HTTP URL, so no TLS certificate could be summarized.",
        severity: "MEDIUM",
        category: "TLS",
        affectedUrl: target,
        evidenceSummary: `Submitted protocol: ${url.protocol}`,
        businessImpact: "Users may be exposed to interception if production traffic is not protected by TLS.",
        technicalImpact: "The scanner could not observe TLS configuration for this asset URL.",
        remediationSummary: "Register and scan the HTTPS endpoint, then enforce HTTPS with HSTS after validation.",
        retestSteps: "Run a new scan against the HTTPS URL.",
        cwe: "CWE-319",
        owaspMapping: ["A02:2021 - Cryptographic Failures"],
        evidenceType: "URL_SCHEME",
        observedValue: url.protocol,
        expectedValue: "https:",
        recommendationType: "TLS_CONFIGURATION",
      })];
    }

    const cert = await withTimeout("TLS certificate summary", getCertificate(url));
    return buildTlsFindingsFromCertificate(target, url, cert);
  },
};

export function buildTlsFindingsFromCertificate(target: string, url: URL, cert: PeerCertificate): NormalizedFinding[] {
    const findings: NormalizedFinding[] = [];
    const validTo = Date.parse(cert.valid_to);
    const daysUntilExpiry = Math.floor((validTo - Date.now()) / (1000 * 60 * 60 * 24));
    const issuer = formatName(cert.issuer);
    const hostnameError = checkServerIdentity(url.hostname, cert);

    if (Number.isFinite(daysUntilExpiry) && daysUntilExpiry < 0) {
      findings.push(makeFinding({
        title: "TLS certificate is expired",
        description: "The server presented a certificate whose validity period has already ended.",
        severity: "HIGH",
        category: "TLS",
        affectedUrl: target,
        evidenceSummary: `Certificate expired on ${cert.valid_to}. Issuer: ${issuer}.`,
        businessImpact: "Browsers and clients may block access or users may bypass warnings, increasing interception risk.",
        technicalImpact: "The certificate is outside its validity period and cannot provide trusted identity assurance.",
        remediationSummary: "Renew and deploy a valid certificate from a trusted certificate authority.",
        retestSteps: "Repeat the TLS summary check and confirm the certificate validity end date is in the future.",
        cwe: "CWE-295",
        owaspMapping: ["A02:2021 - Cryptographic Failures"],
        evidenceType: "TLS_CERTIFICATE",
        observedValue: cert.valid_to,
        expectedValue: "Certificate validity end date in the future",
        rawJson: { issuer, validTo: cert.valid_to, daysUntilExpiry },
        recommendationType: "TLS_CERTIFICATE",
      }));
    } else if (Number.isFinite(daysUntilExpiry) && daysUntilExpiry <= 14) {
      findings.push(makeFinding({
        title: "TLS certificate expires soon",
        description: "The certificate is valid but close to expiry.",
        severity: "LOW",
        category: "TLS",
        affectedUrl: target,
        evidenceSummary: `Certificate expires in ${daysUntilExpiry} days on ${cert.valid_to}.`,
        businessImpact: "Certificate expiry can cause customer-facing outages if renewal automation fails.",
        technicalImpact: "The certificate is approaching the end of its validity period.",
        remediationSummary: "Renew the certificate or verify automated renewal is functioning.",
        retestSteps: "Repeat the TLS summary check after renewal.",
        owaspMapping: ["A05:2021 Security Misconfiguration"],
        evidenceType: "TLS_CERTIFICATE",
        observedValue: `${daysUntilExpiry} days`,
        expectedValue: "More than 14 days until expiry",
        rawJson: { issuer, validTo: cert.valid_to, daysUntilExpiry },
        recommendationType: "TLS_CERTIFICATE",
      }));
    }

    if (hostnameError) {
      findings.push(makeFinding({
        title: "TLS certificate hostname does not match",
        description: "The certificate identity does not match the scanned hostname.",
        severity: "HIGH",
        category: "TLS",
        affectedUrl: target,
        evidenceSummary: hostnameError.message,
        businessImpact: "Users may see browser warnings and could be vulnerable to impersonation.",
        technicalImpact: "TLS identity validation fails for the requested hostname.",
        remediationSummary: "Deploy a certificate whose SAN covers the scanned hostname.",
        retestSteps: "Repeat the TLS summary check and confirm hostname validation succeeds.",
        cwe: "CWE-297",
        owaspMapping: ["A02:2021 - Cryptographic Failures"],
        evidenceType: "TLS_CERTIFICATE",
        observedValue: hostnameError.message,
        expectedValue: `Certificate SAN includes ${url.hostname}`,
        rawJson: { subject: formatName(cert.subject), subjectaltname: cert.subjectaltname },
        recommendationType: "TLS_CERTIFICATE",
      }));
    }

    if (isSelfSigned(cert)) {
      findings.push(makeFinding({
        title: "TLS certificate appears to be self-signed",
        description: "The server certificate appears to be issued by the same subject.",
        severity: "MEDIUM",
        category: "TLS",
        affectedUrl: target,
        evidenceSummary: `Subject and issuer are both ${issuer}.`,
        businessImpact: "Clients may reject the site or users may be trained to ignore certificate warnings.",
        technicalImpact: "The certificate chain may not anchor to a trusted public certificate authority.",
        remediationSummary: "Use a certificate issued by a trusted CA for public-facing services.",
        retestSteps: "Repeat the TLS summary check and confirm issuer differs from subject and chains to a trusted CA.",
        cwe: "CWE-295",
        owaspMapping: ["A02:2021 - Cryptographic Failures"],
        evidenceType: "TLS_CERTIFICATE",
        observedValue: issuer,
        expectedValue: "Trusted CA-issued certificate",
        rawJson: { subject: formatName(cert.subject), issuer },
        recommendationType: "TLS_CERTIFICATE",
      }));
    }

    return findings;
}

function getCertificate(url: URL): Promise<PeerCertificate> {
  return new Promise((resolve, reject) => {
    const socket = connect({
      host: url.hostname,
      port: Number(url.port || 443),
      servername: url.hostname,
      rejectUnauthorized: false,
    });
    socket.once("secureConnect", () => {
      const cert = socket.getPeerCertificate(true);
      socket.end();
      if (!cert || !cert.valid_to) reject(new Error("No TLS certificate was presented."));
      else resolve(cert);
    });
    socket.once("error", reject);
  });
}

function formatName(name?: Record<string, string | string[] | undefined>) {
  if (!name) return "unknown";
  return Object.entries(name).map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("/") : value ?? ""}`).join(", ");
}

function isSelfSigned(cert: PeerCertificate) {
  return formatName(cert.subject) === formatName(cert.issuer);
}
