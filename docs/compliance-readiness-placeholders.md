# LuminarIQ SecureScan Compliance Readiness Placeholders

These placeholders are not legal advice. Review with counsel before publishing.

## Privacy Policy Placeholder

LuminarIQ SecureScan collects account information, organization/project metadata, asset URLs, scan configuration, scanner evidence, findings, reports, audit logs, and operational logs needed to provide defensive security audit services.

Customer scan data is used to run authorized scans, generate findings, provide remediation guidance, produce reports, secure the platform, troubleshoot issues, and improve service reliability. LuminarIQ SecureScan does not sell customer scan data.

Customers are responsible for ensuring they have the right to submit assets, API specifications, repositories, tokens, and related materials for scanning.

Retention period: configure and publish the production value of `DATA_RETENTION_DAYS`. Provide deletion and export procedures before production launch.

## Terms of Use Placeholder

Users may use LuminarIQ SecureScan only for assets they own or are explicitly authorized to test. Users must not use the service for unlawful scanning, harassment, unauthorized access, destructive testing, exploitation, denial-of-service activity, malware delivery, credential theft, or bypass attempts.

LuminarIQ SecureScan provides defensive baseline findings based on scanner evidence. Results may contain false positives or false negatives and should be reviewed by qualified personnel before production remediation.

## Authorized Scanning Policy

Before starting a scan, users must confirm:

> I confirm that I own this asset or have explicit authorization to scan it.

The platform blocks localhost, private networks, link-local addresses, and cloud metadata endpoints for SaaS-hosted scans unless an administrator explicitly enables private-network scanning in a controlled environment.

MVP scanning is non-invasive and defensive. Active attacks, destructive payloads, brute forcing, aggressive crawling, and denial-of-service testing are out of scope.

## Data Processing Notice

LuminarIQ SecureScan may process:

- User account details.
- Organization, project, and asset metadata.
- Website URLs, API specifications, repository metadata, and uploaded ZIPs.
- Optional temporary bearer tokens or repository tokens, encrypted before queueing.
- Scanner observations, evidence summaries, recommendations, reports, and audit logs.

Subprocessors and hosting regions must be documented before production launch.

## Security Contact

Security reports should be sent to:

`SECURITY_CONTACT_EMAIL` from the production environment, for example `security@luminar.example`.

Include affected URL, impact, reproduction steps, and whether any customer data may be involved. Do not include live secrets in email; coordinate a secure transfer channel first.
