import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const hasEmailConfig = env.smtpHost && env.smtpUser && env.smtpPass;

const transporter = hasEmailConfig
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    })
  : null;

export const sendVulnerabilityAlert = async ({ to, name, scan }) => {
  if (!transporter) {
    console.log(`Email alerts skipped for ${to} because SMTP is not configured.`);
    return;
  }

  const highPriorityIssues = scan.issues
    .filter((issue) => ["critical", "high"].includes(issue.severity))
    .map((issue) => `- ${issue.title} (${issue.severity})`)
    .join("\n");

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: `SecureLite Alert: Issues found on ${scan.domain}`,
    text: `Hi ${name},

We completed a new website scan for ${scan.targetUrl}.

Security score: ${scan.securityScore}/100
Summary: ${scan.summary}

Important issues:
${highPriorityIssues || "- No high-priority issues were found"}

Please log in to your SecureLite dashboard to review the full report.
`
  });
};

export const sendNewVulnerabilityAlert = async ({ to, name, scan, newIssues }) => {
  if (!transporter || !newIssues.length) {
    return;
  }

  await transporter.sendMail({
    from: env.emailFrom,
    to,
    subject: `SecureLite Weekly Alert: New issues found on ${scan.domain}`,
    text: `Hi ${name},

SecureLite found new issues on ${scan.targetUrl}.

New findings:
${newIssues.map((issue) => `- ${issue.title} (${issue.severity})`).join("\n")}

Risk level: ${scan.riskLevel}
Security score: ${scan.securityScore}/100

Please review the latest report in your dashboard.
`
  });
};
