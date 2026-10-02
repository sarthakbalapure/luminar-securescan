const severityWeights = {
  critical: 35,
  high: 20,
  medium: 12,
  low: 6,
  info: 2
};

const typeFriendlyCopy = {
  sqli: {
    title: "Possible form or URL injection risk",
    plainEnglish:
      "Someone may be able to trick your website into accepting unsafe input, which can expose or change important data.",
    recommendation:
      "Have your developer use parameterized database queries, validate form inputs, and block dangerous characters.",
    howToFix: [
      "Replace string-built SQL queries with parameterized queries or your ORM's safe query helpers.",
      "Validate and sanitize incoming form values before sending them to the database layer.",
      "Restrict database users to the minimum permissions needed for the application."
    ],
    sampleFix:
      "Example: use `db.query('SELECT * FROM users WHERE email = ?', [email])` instead of concatenating raw input into the SQL string."
  },
  xss: {
    title: "Pages may display unsafe user content",
    plainEnglish:
      "Your website might show harmful code inside the browser, which can put customer accounts or form submissions at risk.",
    recommendation:
      "Escape user-generated content before showing it on the page and enable a strong Content Security Policy.",
    howToFix: [
      "Escape or encode any user-provided text before rendering it into HTML.",
      "Avoid using `dangerouslySetInnerHTML` or direct DOM insertion unless the content is sanitized.",
      "Add a Content-Security-Policy header to reduce the impact of injected scripts."
    ],
    sampleFix:
      "Example: render user text as plain text in React and sanitize rich HTML with a trusted sanitizer before display."
  },
  csrf: {
    title: "Forms may not be protected against fake requests",
    plainEnglish:
      "A hacker may be able to trick a logged-in user into clicking something that performs an action they did not intend.",
    recommendation:
      "Add CSRF tokens to sensitive forms and verify requests on the server before making changes.",
    howToFix: [
      "Generate a unique CSRF token for each user session.",
      "Include that token in all state-changing forms and AJAX requests.",
      "Reject any request where the token is missing, invalid, or expired."
    ],
    sampleFix: "Example: issue a CSRF token on login and verify it on every POST, PUT, PATCH, or DELETE request."
  },
  ssl: {
    title: "SSL/TLS setup needs attention",
    plainEnglish:
      "Visitors may not be getting a fully secure connection, which can reduce trust and expose traffic to interception.",
    recommendation:
      "Install a valid HTTPS certificate, renew it before expiry, and redirect all traffic to HTTPS.",
    howToFix: [
      "Install or renew your TLS certificate through your host, CDN, or certificate provider.",
      "Force HTTP traffic to redirect to HTTPS.",
      "Enable HSTS after confirming your HTTPS setup is stable."
    ],
    sampleFix: "Example: configure your reverse proxy or hosting panel to redirect all port 80 traffic to HTTPS."
  },
  port: {
    title: "Unnecessary internet-facing service detected",
    plainEnglish:
      "Your website server appears to have extra doors open to the internet. Each open door can create extra risk if it is not needed.",
    recommendation:
      "Close unused ports in your firewall and only keep required services publicly accessible.",
    howToFix: [
      "Review which services truly need public internet access.",
      "Block unused ports at the server firewall, cloud security group, or hosting panel.",
      "Restrict admin-only services such as SSH or database access to known IP addresses."
    ],
    sampleFix: "Example: allow ports 80 and 443 publicly, but restrict SSH and database ports to private networks or office IPs."
  },
  malware: {
    title: "Malware reputation warning",
    plainEnglish:
      "Security services believe this website or URL may be associated with harmful files, unsafe behavior, or known threats.",
    recommendation:
      "Review hosted files, redirects, and downloads immediately, then clean and rescan the site before sending more traffic to it.",
    howToFix: [
      "Scan your hosting account and website files for injected scripts, backdoors, or suspicious uploads.",
      "Review recent plugins, themes, third-party scripts, and download links that may have introduced malware.",
      "After cleanup, rotate compromised credentials and rescan to confirm the URL reputation improves."
    ],
    sampleFix:
      "Example: remove suspicious files, patch the CMS, reset credentials, and request a new reputation review after the site is clean."
  },
  reputation: {
    title: "Suspicious domain reputation detected",
    plainEnglish:
      "Some threat intelligence services do not fully trust this domain yet, which can reduce visitor trust and may signal risky behavior.",
    recommendation:
      "Check for unexpected redirects, misleading downloads, or unusual domain behavior that could be hurting reputation.",
    howToFix: [
      "Inspect the site for redirects, injected ads, or files you did not intentionally publish.",
      "Review DNS records, landing pages, and outbound links for anything unusual or misleading.",
      "After cleanup, rescan and request reputation reassessment if needed."
    ],
    sampleFix:
      "Example: remove suspicious redirect logic, verify DNS settings, and submit the cleaned URL for a fresh reputation check."
  },
  config: {
    title: "Important security settings are missing",
    plainEnglish:
      "Your website may be missing browser protection settings that help block common attacks and reduce exposure.",
    recommendation:
      "Add security headers such as Content-Security-Policy, X-Frame-Options, Strict-Transport-Security, and Referrer-Policy.",
    howToFix: [
      "Update your web server, CDN, or hosting platform to send modern security headers.",
      "Start with Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, HSTS, and Referrer-Policy.",
      "Test the site after each header change to avoid blocking expected content."
    ],
    sampleFix:
      "Example: add `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` in your server or CDN response rules."
  },
  header: {
    title: "Browser security headers should be improved",
    plainEnglish:
      "Visitors' browsers are not getting the full set of safety instructions that help prevent some common attacks.",
    recommendation:
      "Update your server or CDN to return stronger security headers for every page.",
    howToFix: [
      "Check your current response headers using your browser dev tools or hosting dashboard.",
      "Add the missing header at the edge or server layer so every page includes it.",
      "Retest after deployment to confirm the header is present on all important routes."
    ],
    sampleFix:
      "Example: configure your CDN or Nginx server block to return the missing header for all HTML responses."
  }
};

export const toPlainIssue = ({ scanner = "custom", type, severity, technicalDetails }) => {
  const friendlyCopy = typeFriendlyCopy[type] || {
    title: "Security issue found",
    plainEnglish:
      "The scan found a weakness that should be reviewed so it does not become a bigger problem later.",
    recommendation: "Review this finding with your developer or hosting provider and apply the recommended fix."
  };

  return {
    scanner,
    type,
    severity,
    title: friendlyCopy.title,
    technicalDetails,
    plainEnglish: friendlyCopy.plainEnglish,
    recommendation: friendlyCopy.recommendation,
    howToFix: friendlyCopy.howToFix || [],
    sampleFix: friendlyCopy.sampleFix || ""
  };
};

export const calculateSecurityScore = (issues = [], ssl = { isValid: true }, openPorts = []) => {
  const issuePenalty = issues.reduce((total, issue) => total + (severityWeights[issue.severity] || 0), 0);
  const sslPenalty = ssl.isValid ? 0 : 18;
  const portPenalty = openPorts.filter((port) => port.status === "open").length * 4;

  return Math.max(0, Math.min(100, 100 - issuePenalty - sslPenalty - portPenalty));
};

export const getRiskLevel = (securityScore) => {
  if (securityScore >= 80) {
    return "Low";
  }

  if (securityScore >= 55) {
    return "Medium";
  }

  return "High";
};

export const buildSummary = ({ securityScore, issues }) => {
  if (!issues.length && securityScore >= 90) {
    return "Good news: we did not find any major security problems in this scan. Keep monitoring your site and stay current with updates.";
  }

  if (securityScore >= 75) {
    return "Your site looks fairly healthy, but there are a few issues worth fixing soon to reduce risk.";
  }

  if (securityScore >= 50) {
    return "Your site has some meaningful security gaps. It is still manageable, but you should plan fixes in the near term.";
  }

  return "Your site has urgent security issues that should be addressed quickly to protect customers and business data.";
};

export const buildFixList = (issues = []) =>
  issues.slice(0, 5).map((issue) => ({
    label: issue.title,
    action: issue.recommendation,
    steps: issue.howToFix || []
  }));
