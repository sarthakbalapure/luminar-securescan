# LuminarIQ SecureScan Report Generation

## Overview

SecureScan generates protected security reports from the selected PostgreSQL `Scan`, its `Asset`, organization/project ownership, findings, evidence, and remediation records. Reports are never written to the frontend public directory. Access to preview and export routes requires a valid JWT and organization membership; platform administrators may access all reports.

## Report Types

- `EXECUTIVE_SUMMARY`: security score, severity counts, top five risks, business impact, and action plan for leadership.
- `TECHNICAL_FINDINGS`: scan metadata, evidence summaries, OWASP/CWE/CVSS data, remediation, examples, and retest steps for technical teams.
- `FULL_SECURITY_AUDIT`: cover, executive and technical sections, methodology, remediation roadmap, retest plan, appendix, glossary, and disclaimer.
- `RETEST_REPORT`: previous/latest score comparison, fixed, open, new, and risk-accepted findings.

Legacy `EXECUTIVE`, `TECHNICAL`, and `FULL` values remain readable and generatable for backward compatibility.

## Generate From The UI

1. Open a completed scan from **Scans**.
2. Select **Generate report**.
3. Choose the report type and included sections.
4. Select **Generate Report**.
5. SecureScan opens the protected HTML preview when generation completes.

Reports can only be generated for completed scans. The default maximum is 500 findings per report.

## Preview And Exports

The report preview provides these authenticated actions:

- **Download PDF**: `GET /reports/:reportId/download`
- **Export CSV**: `GET /reports/:reportId/findings.csv`
- **Export JSON**: `GET /reports/:reportId/json`
- **Print**: prints the protected HTML preview from the browser

The reports list is available from **Reports**. Deleting a report removes the database record and all generated local export files.

## API

All routes require `Authorization: Bearer <JWT>`.

```text
POST   /reports/generate
POST   /scans/:scanId/reports        # backward-compatible route
GET    /reports
GET    /reports/:reportId
GET    /reports/:reportId/download
GET    /reports/:reportId/html
GET    /reports/:reportId/json
GET    /reports/:reportId/findings.csv
DELETE /reports/:reportId
```

Example request:

```json
{
  "scanId": "9fd8953c-fd92-4f54-bf0c-33fca8d888c4",
  "assetId": "e060c3d8-0f45-48ed-a3aa-94cfb9811b94",
  "reportType": "FULL_SECURITY_AUDIT",
  "includeExecutiveSummary": true,
  "includeTechnicalDetails": true,
  "includeRemediation": true,
  "includeEvidence": true,
  "includeAppendix": true
}
```

## Score And Risk Rating

The stored scan score is used when available. Otherwise, calculation starts at 100 and subtracts 25 per Critical, 12 per High, 6 per Medium, 2 per Low, and 0.5 per Info finding. The result is clamped between 0 and 100.

| Score | Rating |
| --- | --- |
| 90-100 | Excellent |
| 75-89 | Good |
| 60-74 | Moderate |
| 40-59 | Poor |
| 0-39 | Critical |

Severity totals are calculated directly from the scan's current findings and include Critical, High, Medium, Low, Info, and total counts.

## Sensitive Data Protection

Before report rendering and export, SecureScan masks authorization headers, bearer tokens, cookies, passwords, API keys, access/refresh tokens, client secrets, and JWT-like values. Export data deliberately excludes raw ZAP alerts, Nuclei results, sqlmap summaries, curl commands, and raw evidence JSON. Evidence text is length-limited.

Generated files live under `REPORT_STORAGE_PATH` with separate `pdf`, `html`, `json`, and `csv` directories. Stored paths are resolved beneath that root to prevent path traversal.

## Configuration

```env
REPORTS_ENABLED=true
REPORT_STORAGE_PATH=./storage/reports
REPORT_BRAND_NAME=LuminarIQ SecureScan
REPORT_COMPANY_NAME=LuminarIQ SoftSol Pvt. Ltd.
REPORT_LOGO_PATH=
REPORT_DEFAULT_FORMAT=pdf
REPORT_MAX_FINDINGS=500
REPORT_INCLUDE_RAW_EVIDENCE=false
```

Run the Prisma migration before generating reports:

```powershell
corepack pnpm --filter @luminar-iq/api prisma:migrate
```

## Audit Events

Report actions create `AuditLog` records for generation started/completed/failed, viewed, downloaded, CSV/JSON exported, and deleted. Metadata includes organization, project, asset, scan, report, report type, user, and timestamp where applicable.

## Troubleshooting

- **Reports can only be generated for completed scans**: wait for the worker to finish the scan.
- **Report generation is disabled**: set `REPORTS_ENABLED=true` and restart the API.
- **Report file is missing**: regenerate the report; local files may have been removed or the storage volume may not be mounted.
- **Access denied**: sign in with an organization member that owns the scan, or use an administrator account.
- **PDF uses a simplified fallback**: install the Playwright Chromium browser in the deployment image. HTML, CSV, and JSON remain available.

## Known Limitations

- Local report storage must be replaced with private object storage for horizontally scaled production deployments.
- Generation currently runs in the API request; high-volume deployments should move rendering to a dedicated BullMQ report worker.
- Retest matching uses normalized finding titles. A future release should use stable scanner fingerprints across scans.
- `REPORT_LOGO_PATH` and `REPORT_DEFAULT_FORMAT` are reserved for later branding and default-format customization.
