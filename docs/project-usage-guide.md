# LuminarIQ SecureScan Project Documentation and Website Usage Guide

## 1. Project Overview

LuminarIQ SecureScan is a defensive SaaS security audit platform by LuminarIQ SoftSol Pvt. Ltd.

The platform helps users scan authorized websites, review security findings, understand risk severity, get remediation guidance, and generate professional PDF reports.

Core message:

> Find and fix security risks before attackers do.

This project includes:

- Next.js frontend website/dashboard.
- NestJS backend API.
- PostgreSQL database.
- Prisma ORM.
- Redis and BullMQ scan queue.
- Scanner worker.
- Website baseline security checks.
- Findings and severity engine.
- AI-style template remediation guidance.
- PDF report generation.
- Admin monitoring panel.

## 2. What This Website Can Do

The MVP supports:

- User registration and login.
- Organization and project management.
- Website asset creation.
- Authorized website security scans.
- Scan status tracking.
- Security findings with severity and evidence.
- OWASP mapping.
- Business and technical impact explanation.
- Remediation recommendations.
- Security score dashboard.
- Finding status updates.
- PDF report generation.
- Admin usage and scan monitoring.

## 3. Important Authorization Notice

Only scan websites that you own or have explicit permission to test.

Before starting a scan, the website requires confirmation:

> I confirm that I own this asset or have explicit authorization to scan it.

Do not scan third-party websites without permission.

## 4. Local Development Requirements

Install these first:

- Node.js 20+
- Docker Desktop
- pnpm through Corepack

Check Node:

```powershell
node -v
```

Enable Corepack:

```powershell
corepack enable
```

## 5. Environment Setup

The project uses `.env` files for local configuration.

For your current local setup, the database URL should use port `55432`:

```text
DATABASE_URL=postgresql://securescan:securescan@127.0.0.1:55432/securescan
```

Important local ports:

| Service | URL / Port |
|---|---|
| Frontend website | `http://localhost:3010` |
| Backend API | `http://localhost:4010` |
| Frontend API proxy | `http://localhost:3010/api/backend` |
| PostgreSQL | `127.0.0.1:55432` |
| Redis | `localhost:6379` |
| OWASP ZAP | `localhost:8080` |

## 6. Start Docker Services

Open PowerShell in:

```powershell
C:\startup
```

Start PostgreSQL, Redis, and ZAP:

```powershell
docker compose up -d
```

Check services:

```powershell
docker compose ps
```

You should see:

- `postgres`
- `redis`
- `zap`

## 7. Database Migration and Seed

Run migrations:

```powershell
corepack pnpm --filter @luminar-iq/api prisma:migrate
```

Run seed data:

```powershell
corepack pnpm --filter @luminar-iq/api prisma:seed
```

The seed creates:

- Demo user
- Admin user
- Demo organization
- Demo project
- Demo website asset
- Demo scan
- Sample findings
- Sample report data

## 8. Start the Website and Real Scanner

Open four separate PowerShell terminals in `C:\startup`.

Terminal 1, start Docker services:

```powershell
docker compose up -d
docker compose ps
```

Make sure PostgreSQL and Redis are healthy. Scans will not run without Redis.

Terminal 2, start API:

```powershell
corepack pnpm dev:api
```

Wait until you see:

```text
Nest application successfully started
```

Terminal 3, start scanner worker:

```powershell
corepack pnpm dev:worker
```

Wait until you see:

```text
{"event":"scanner_worker_ready","queue":"website-scans"}
```

Terminal 4, start frontend website:

```powershell
corepack pnpm dev:web
```

Then open:

```text
http://localhost:3010
```

## 9. Demo Login Details

Demo user:

```text
Email: vishal@example.com
Password: User@123
```

Admin user:

```text
Email: admin@luminarsecure.com
Password: Admin@123
```

Use the demo user to test the normal customer workflow.

Use the admin user to test the admin panel.

## 10. How to Use the Website

### Step 1: Login

1. Open `http://localhost:3010`.
2. Go to the login page.
3. Enter demo email and password.
4. Click login.

After login, you will reach the dashboard.

### Step 2: View Dashboard

The dashboard shows:

- Latest security score.
- Total assets.
- Total scans.
- Open critical findings.
- Finding severity counts.
- Recent activity.
- Top findings.

Use this page to understand the overall security posture.

### Step 3: View Organizations

Go to:

```text
/organizations
```

Here you can see your organizations/workspaces.

An organization represents a company, client, or team workspace.

### Step 4: View or Create Projects

Go to:

```text
/projects
```

A project groups assets together.

Example:

- Company website
- Client website audit
- SaaS app security review

### Step 5: Add a Website Asset

Go to:

```text
/assets/new
```

Enter:

- Project
- Asset name
- Website URL
- Asset type

Example:

```text
Name: Demo Website
URL: https://example.com
Type: WEBSITE
```

Save the asset.

### Step 6: Open Asset Detail Page

After creating an asset, open its asset detail page.

Here you can:

- View asset metadata.
- See scan history.
- Start a new scan.

### Step 7: Start a Website Scan

Click:

```text
Start Scan
```

The website will ask you to confirm authorization.

Check the confirmation box:

```text
I confirm that I own this asset or have explicit authorization to scan it.
```

Then start the scan.

For a normal internal website baseline scan, leave the default scanner mode selected. This runs:

- HTTPS check
- Security headers check
- Cookie security check
- Exposed files check
- TLS summary check

Only enable optional tools such as ZAP, Nuclei, or sqlmap if those tools are installed and configured. The safest demo flow is the default website baseline scan.

### Step 8: View Scan Progress

After starting a scan, go to the scan progress page.

The scan status can be:

- `QUEUED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `CANCELLED`

The scanner worker processes the scan asynchronously.

If the scan stays `QUEUED`, the worker or Redis is not running.

Check Redis:

```powershell
docker compose ps
```

Restart the worker:

```powershell
corepack pnpm dev:worker
```

### Step 9: View Scan Results

Open the scan detail page.

You can see:

- Asset URL
- Scan type
- Started time
- Completed time
- Security score
- Finding count
- Findings table

You can filter findings by severity and status.

If the scan status is `FAILED`, open the scan detail page and check each job row. Common causes are:

- Redis was stopped while the scan was queued.
- Worker was not running.
- Target website was unreachable.
- Target resolved to localhost, private IP, or metadata IP and was blocked by scanner safety.
- Optional scanner tool such as ZAP, Nuclei, or sqlmap was not available.

### Step 10: Open Finding Detail

Click any finding.

The finding detail page shows:

- Title
- Severity
- Affected URL
- Category
- OWASP mapping
- Evidence
- Business impact
- Technical impact
- Recommended fix
- Code/config example
- Retest steps
- Status dropdown

### Step 11: Update Finding Status

You can update status to:

- `OPEN`
- `IN_PROGRESS`
- `RISK_ACCEPTED`
- `FALSE_POSITIVE`
- `FIXED`
- `RETEST_REQUIRED`

Use this to track remediation work.

### Step 12: Generate Report

Generate reports only after the scan status is `COMPLETED`.

From a completed scan detail page, click:

```text
Generate Report
```

Report types:

- Executive report
- Technical report
- Full report

Reports include:

- Security score
- Severity summary
- Findings
- Evidence
- Remediation steps
- Retest steps
- Disclaimer

### Step 13: Download Report

Go to:

```text
/reports
```

Select a report and download the PDF.

## 11. Admin Panel Usage

Login as:

```text
admin@luminarsecure.com
Admin@123
```

Open:

```text
/admin
```

Admin pages:

| Page | Purpose |
|---|---|
| `/admin` | Platform overview |
| `/admin/organizations` | View organizations |
| `/admin/users` | View users |
| `/admin/scans` | View scans and failed jobs |
| `/admin/findings` | View findings |
| `/admin/audit-logs` | View audit activity |
| `/admin/system-health` | Check API, DB, queue health |
| `/admin/subscriptions` | Subscription placeholder |

Admin can:

- View usage metrics.
- View failed scans.
- Retry failed scan jobs.
- View audit logs.
- Disable organizations.
- Export usage report.

## 12. Scanner Checks

The website baseline scan checks:

### HTTPS Check

- Detects HTTP usage.
- Checks HTTP to HTTPS redirect.
- Flags missing HTTPS as high severity.

### Security Headers Check

Checks for:

- Content-Security-Policy
- Strict-Transport-Security
- X-Content-Type-Options
- X-Frame-Options or CSP frame-ancestors
- Referrer-Policy
- Permissions-Policy
- Cross-Origin-Opener-Policy
- Cross-Origin-Resource-Policy

### Cookie Security Check

Checks cookies for:

- Secure flag
- HttpOnly flag
- SameSite flag
- Excessive expiration
- Sensitive-looking cookie names

### Exposed Files Check

Safely checks common public paths:

- `/.env`
- `/.git/config`
- `/config.php`
- `/backup.zip`
- `/db.sql`
- `/phpinfo.php`
- `/server-status`
- `/.DS_Store`
- `/web.config`
- `/robots.txt`
- `/sitemap.xml`

### TLS Summary Check

Checks:

- Certificate validity
- Expiry date
- Hostname match
- Issuer
- Self-signed certificate warning
- Expired certificate finding

## 13. Understanding Severity

| Severity | Meaning |
|---|---|
| Critical | Immediate serious risk |
| High | Important issue to fix soon |
| Medium | Security weakness that should be planned |
| Low | Hardening improvement |
| Info | Informational observation |

## 14. Understanding Security Score

The score starts at 100.

Findings reduce the score:

| Finding Severity | Score Penalty |
|---|---:|
| Critical | -25 |
| High | -12 |
| Medium | -6 |
| Low | -2 |
| Info | -0.5 |

Lower score means higher risk.

## 15. Troubleshooting

### Database authentication failed

Use the current local port:

```text
127.0.0.1:55432
```

Make sure `.env` and `apps/api/.env` contain:

```text
DATABASE_URL=postgresql://securescan:securescan@127.0.0.1:55432/securescan
```

Then restart Docker:

```powershell
docker compose down -v
docker compose up -d
```

Then run:

```powershell
corepack pnpm --filter @luminar-iq/api prisma:migrate
corepack pnpm --filter @luminar-iq/api prisma:seed
```

### Website does not open

Make sure frontend is running:

```powershell
corepack pnpm dev:web
```

Open:

```text
http://localhost:3010
```

### API is not working

Make sure API is running:

```powershell
corepack pnpm dev:api
```

API runs on:

```text
http://localhost:4010
```

### Register or login shows "NetworkError when attempting to fetch resource"

This usually means the browser could not call the API.

Check these items:

1. Make sure the API terminal is running:

```powershell
corepack pnpm dev:api
```

2. Open the website with this exact URL:

```text
http://localhost:3010
```

3. Make sure `.env` and `apps/api/.env` allow both local browser origins:

```text
WEB_ORIGIN=http://localhost:3010,http://127.0.0.1:3010
```

4. Restart the API after changing `.env`.

5. Test the API in your browser:

```text
http://localhost:4010/auth/me
```

It should return an authentication error, which means the API is reachable.

The frontend normally calls the API through the Next.js proxy:

```text
http://localhost:3010/api/backend
```

So this should also return an authentication error:

```text
http://localhost:3010/api/backend/auth/me
```

### Login/register does not work from an external browser or another device

If you open the website from another browser/device using your computer IP, do not use `localhost`.

Example:

```text
http://192.168.1.20:3010
```

The frontend will call:

```text
http://192.168.1.20:4010
```

For this to work:

1. Start the API after the latest config change:

```powershell
corepack pnpm dev:api
```

2. Start the frontend:

```powershell
corepack pnpm dev:web
```

3. If Windows Firewall asks, allow Node.js for private networks.

4. Make sure both devices are on the same Wi-Fi/LAN.

5. Find your computer IP:

```powershell
ipconfig
```

Use the IPv4 address from your active Wi-Fi/Ethernet adapter.

6. Open the website externally:

```text
http://YOUR_IPV4_ADDRESS:3010
```

Do not open `http://localhost:3010` from another device, because `localhost` means that other device itself, not your development machine.

### Scans stay queued

Make sure worker is running:

```powershell
corepack pnpm dev:worker
```

Also make sure Redis is running:

```powershell
docker compose ps
```

Expected Redis line:

```text
startup-redis-1   redis:7-alpine   Up ...   0.0.0.0:6379->6379/tcp
```

If the worker shows this error:

```text
ECONNREFUSED 127.0.0.1:6379
```

Redis is not reachable. Run:

```powershell
docker compose up -d
docker compose ps
```

Then stop and restart the worker terminal.

### Scan completes but report looks empty

Reports are generated from saved scan findings. Check these items:

1. Scan status must be `COMPLETED`.
2. The scan detail page should show findings or a clear "no findings" state.
3. The worker must have been running when the scan was queued.
4. Generate the report from the completed scan page, not from an old queued/failed scan.
5. If the scan has zero findings, the report will still generate, but the findings section will say no findings were recorded.

### Real scan checklist

Before testing a real scan, confirm:

```powershell
docker compose ps
```

PostgreSQL and Redis must be up.

```powershell
Invoke-RestMethod http://localhost:4010/auth/me
```

Expected result is `401`.

```powershell
Invoke-RestMethod http://localhost:3010/api/backend/auth/me
```

Expected result is `401`.

Then start or keep running:

```powershell
corepack pnpm dev:api
corepack pnpm dev:worker
corepack pnpm dev:web
```

### Docker error

Start Docker Desktop first.

Then:

```powershell
docker compose up -d
```

## 16. Common Commands

Install dependencies:

```powershell
corepack pnpm install
```

Start Docker services:

```powershell
docker compose up -d
```

Stop Docker services:

```powershell
docker compose down
```

Reset local database:

```powershell
docker compose down -v
docker compose up -d
corepack pnpm --filter @luminar-iq/api prisma:migrate
corepack pnpm --filter @luminar-iq/api prisma:seed
```

Start API:

```powershell
corepack pnpm dev:api
```

Start worker:

```powershell
corepack pnpm dev:worker
```

Start website:

```powershell
corepack pnpm dev:web
```

Run tests:

```powershell
corepack pnpm test
```

Build project:

```powershell
corepack pnpm build
```

## 17. Recommended Demo Flow

Use this flow when showing the project:

1. Login as demo user.
2. Open dashboard.
3. View existing demo project.
4. Open demo website asset.
5. Start a scan with authorization confirmation.
6. Wait for scan completion.
7. Open findings.
8. Open a finding detail page.
9. Show remediation guidance.
10. Generate a full report.
11. Download report.
12. Login as admin.
13. Open admin dashboard.
14. Show scans, findings, audit logs, and system health.

## 18. Production Notes

For production, do not use demo credentials or local secrets.

Before production launch:

- Use strong secrets.
- Use managed PostgreSQL.
- Use managed Redis.
- Configure HTTPS/TLS.
- Configure backups.
- Configure monitoring and alerts.
- Review privacy policy and terms.
- Use Redis-backed rate limiting.
- Implement refresh-token rotation.
- Run external security testing.
