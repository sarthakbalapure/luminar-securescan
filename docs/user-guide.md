# LuminarIQ SecureScan User Guide

## 1. What is LuminarIQ SecureScan?

LuminarIQ SecureScan is a defensive security audit platform for websites, applications, APIs, and source code repositories.

It helps teams find common security issues, understand their impact, prioritize what to fix first, and generate professional reports for business, technical, and customer-facing use.

SecureScan is designed to make security findings easier to understand. It explains what was found, why it matters, how serious it is, and how to fix it.

## 2. Who should use it?

LuminarIQ SecureScan is useful for:

- Startup founders who need a quick security posture overview.
- CTOs and IT managers who need visibility across web assets.
- Developers who need clear remediation guidance.
- Web agencies managing client websites or applications.
- Security teams looking for baseline checks and report generation.
- Compliance or risk teams preparing evidence for reviews.

## 3. What can it scan?

SecureScan can support several asset types:

- Websites
- Web applications
- APIs using OpenAPI or Swagger specifications
- Source code repositories
- Uploaded repository ZIP files

Website scans can check areas such as:

- HTTPS usage
- TLS certificate health
- Security headers
- Cookie security
- Publicly exposed sensitive files
- Passive OWASP ZAP baseline alerts when enabled

API scans can check areas such as:

- Missing authentication declarations
- Missing security schemes
- CORS configuration
- Sensitive response schema fields
- Safe endpoint posture

Repository scans can check areas such as:

- Hardcoded secret indicators
- Dependency vulnerabilities
- Static code issues
- Dockerfile and configuration risks
- Environment files
- CI/CD workflow secret leakage patterns

## 4. Important Authorization Notice

Only scan assets that you own or have explicit permission to test.

Before starting a scan, SecureScan requires you to confirm:

`I confirm that I own this asset or have explicit authorization to scan it.`

This is important. Scanning systems without permission may violate laws, contracts, or acceptable use policies.

SecureScan is designed for defensive, authorized security review only.

## 5. Creating an Account

1. Open the SecureScan web app.
2. Go to the registration page.
3. Enter your name, email address, and password.
4. Click Create account.
5. After registration, you will be signed in and taken to the dashboard.

Use a strong password and keep your login details private.

## 6. Creating an Organization

An organization represents your company, team, or client workspace.

1. Go to Organizations.
2. Click Create organization.
3. Enter the organization name.
4. Enter a unique slug if requested.
5. Save the organization.

Examples:

- `Acme Security`
- `Northstar Apps`
- `Client Portal Audit`

## 7. Creating a Project

A project groups related assets together.

Examples:

- Customer Portal
- Marketing Website
- Mobile API
- Client Website Review

To create a project:

1. Go to Projects.
2. Click Create project.
3. Select the organization.
4. Enter the project name.
5. Add an optional description.
6. Save the project.

## 8. Adding a Website Asset

An asset is something you want to scan.

To add a website asset:

1. Go to the project.
2. Click Add asset.
3. Select Website as the asset type.
4. Enter a clear asset name.
5. Enter the website URL, such as `https://example.com`.
6. Save the asset.

Use the production URL only if you are authorized to scan it. For testing, use a staging or demo environment when possible.

## 9. Starting a Security Scan

To start a scan:

1. Open the asset detail page.
2. Click Start Scan.
3. Read the authorization notice.
4. Check the confirmation box only if you own the asset or have permission.
5. Select optional scan settings if available.
6. Click Start scan.

After the scan starts, SecureScan will queue the work and process it in the background.

## 10. Understanding Scan Status

Scans can have several statuses:

| Status | Meaning |
| --- | --- |
| Queued | The scan has been created and is waiting for a worker. |
| Running | The scan is currently being processed. |
| Completed | The scan finished successfully. |
| Failed | The scan could not complete. |
| Cancelled | The scan was stopped before completion. |

If a scan fails, review the scan detail page for error messages. A single failed check may not always mean the entire scan failed.

## 11. Understanding the Security Score

The security score is a number from 0 to 100.

- 100 means no findings were detected by the selected checks.
- Lower scores indicate more or higher-severity findings.
- Critical and High findings reduce the score more than Low or Info findings.

The score is a guide, not a guarantee. A high score does not mean the asset is perfectly secure. It means the selected baseline checks did not find major issues.

## 12. Understanding Severity Levels

SecureScan uses five severity levels:

| Severity | Meaning |
| --- | --- |
| Critical | Very serious issue that may expose sensitive data or create major risk. Fix immediately. |
| High | Important issue that should be prioritized soon. |
| Medium | Meaningful security weakness that should be planned for remediation. |
| Low | Hardening or best-practice improvement. |
| Info | Informational observation for awareness. |

Recommended order of work:

1. Critical
2. High
3. Medium
4. Low
5. Info

## 13. Reading Findings

A finding is a security issue or observation detected during a scan.

Each finding usually includes:

- Title
- Severity
- Affected URL or asset
- Category
- OWASP mapping
- Evidence summary
- Business impact
- Technical impact
- Recommended fix
- Retest steps
- Status

Read the title and severity first. Then review the evidence and recommended fix.

## 14. Understanding Evidence

Evidence explains what SecureScan observed.

Examples:

- A missing security header
- A cookie without a Secure flag
- An expired TLS certificate
- A publicly accessible `.env` file
- A repository file that appears to contain a secret pattern

Evidence helps your team confirm whether the finding is real and understand where to fix it.

Sensitive values should be redacted. SecureScan should not show full secret values in the UI or reports.

## 15. Using Remediation Recommendations

Recommendations explain how to fix a finding.

They may include:

- Plain-English explanation
- Business impact
- Technical impact
- Suggested configuration changes
- Code examples
- Retest steps

Developers should review recommendations before applying them. Some fixes depend on your application architecture, hosting provider, or framework.

## 16. Updating Finding Status

Finding statuses help your team track remediation work.

Common statuses:

| Status | When to use it |
| --- | --- |
| Open | The finding still needs review or remediation. |
| In Progress | Someone is actively working on the fix. |
| Risk Accepted | The team accepts the risk for business reasons. |
| False Positive | The finding is not valid after review. |
| Fixed | The issue has been fixed. |
| Retest Required | A fix was made and a new scan is needed. |

To update a finding:

1. Open the finding detail page.
2. Choose the new status.
3. Confirm the change.

Use Risk Accepted carefully. It should usually include a business reason or approval process.

## 17. Running a Retest

A retest checks whether a fix worked.

Recommended retest process:

1. Review the finding.
2. Apply the recommended fix.
3. Mark the finding as Retest Required or Fixed.
4. Run a new scan on the same asset.
5. Confirm the finding no longer appears.

If a previous finding is no longer detected in a later scan, SecureScan may mark it as fixed depending on the workflow.

## 18. Generating Reports

Reports help you share scan results with executives, developers, clients, or auditors.

Report types:

| Report Type | Best For |
| --- | --- |
| Executive | Business summary, risk level, top issues, action plan |
| Technical | Developers, engineers, security teams |
| Full | Complete report with executive and technical sections |

To generate a report:

1. Open a completed scan.
2. Choose the report type.
3. Click Generate report.
4. Wait for the report to be created.

## 19. Downloading Reports

To download a report:

1. Go to the scan detail page or Reports page.
2. Find the report.
3. Click Download PDF.

The report can be shared with internal teams or clients, as long as your organization permits sharing the scan results.

## 20. Sharing Reports with Developers

When sharing reports with developers:

- Include the technical report or full report.
- Highlight Critical and High findings first.
- Assign owners for each major finding.
- Share the affected URLs or files.
- Include retest steps.
- Avoid sharing reports publicly.

Reports may include sensitive security details. Treat them as confidential.

## 21. Best Practices

- Scan only assets you own or are authorized to test.
- Start with staging or test environments when possible.
- Fix Critical and High findings first.
- Run a retest after applying fixes.
- Generate reports after important milestones.
- Keep findings updated with accurate statuses.
- Avoid storing secrets in source code.
- Use HTTPS everywhere.
- Review security headers regularly.
- Keep TLS certificates valid and renewed.
- Limit who can access reports.

## 22. Common Issues and Troubleshooting

### I cannot log in

Check:

- Email address is correct.
- Password is correct.
- The account exists.
- Backend API is running.

For demo data, the default login may be:

- Email: `vishal@example.com`
- Password: `User@123`

### The scan will not start

Check:

- You checked the authorization confirmation box.
- The asset exists.
- You have access to the organization/project.
- The backend API is running.
- Redis/worker services are running.

### The scan is stuck in Queued

Possible causes:

- Scanner worker is not running.
- Redis is unavailable.
- Worker cannot connect to the database.

### The scan failed

Open the scan detail page and review job errors. Common causes:

- Target unreachable
- Timeout
- Invalid URL
- Blocked private/internal address
- Scanner service unavailable

### Report generation failed

Possible causes:

- Report renderer unavailable
- Scan not found
- You do not have access to the scan
- Scan data is incomplete

### I see a finding I believe is wrong

Open the finding and review the evidence. If it is not valid, mark it as False Positive and add internal notes if your workflow supports comments.

## 23. FAQ

### Is SecureScan a penetration test?

No. SecureScan provides defensive baseline security checks. It is not a replacement for a full manual penetration test.

### Can I scan any website?

No. You should only scan websites you own or have explicit permission to scan.

### Does SecureScan exploit vulnerabilities?

No. The MVP is designed for safe, non-invasive checks.

### What does the security score mean?

It is a simple summary score based on detected findings and their severities. It helps prioritize work but does not guarantee complete security.

### Why do I need to confirm authorization?

Because scanning systems without permission can be illegal or harmful. The confirmation protects both you and the platform.

### Can I share reports with clients?

Yes, if you are authorized to share the results. Reports may contain sensitive security details, so treat them as confidential.

### What should I fix first?

Fix Critical findings first, then High, then Medium. Low and Info items can usually be scheduled after urgent risks are handled.

### Does SecureScan store secrets?

SecureScan is designed to redact sensitive evidence and avoid storing plaintext scan tokens. Still, you should avoid uploading or exposing real secrets whenever possible.

### Can SecureScan scan APIs?

Yes. API scans use OpenAPI or Swagger specifications and safe baseline checks.

### Can SecureScan scan repositories?

Yes. Repository scans can check for hardcoded secret indicators, dependency vulnerabilities, static code issues, and insecure configuration patterns.

## 24. Glossary

| Term | Meaning |
| --- | --- |
| Asset | A website, API, repository, or other system registered for scanning. |
| Organization | A workspace for a company, team, or client. |
| Project | A group of related assets. |
| Scan | A security check run against an asset. |
| Finding | A detected security issue or observation. |
| Evidence | Details showing what the scanner observed. |
| Severity | The seriousness of a finding. |
| Security Score | A 0-100 score based on findings and severities. |
| Remediation | The recommended fix for a finding. |
| Retest | A follow-up scan to confirm whether a fix worked. |
| OWASP | A widely used source of web application security guidance. |
| TLS | Technology used to secure HTTPS connections. |
| Security Headers | Browser-facing HTTP headers that help reduce common web risks. |
| False Positive | A finding that appears to be an issue but is not valid after review. |
| Risk Accepted | A known issue that the business chooses not to fix immediately. |
| Audit Log | A record of important user or system actions. |
