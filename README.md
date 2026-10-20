# LuminarIQ SecureScan

LuminarIQ SecureScan is a defensive security-audit SaaS platform from **LuminarIQ SoftSol Pvt. Ltd.** It helps authorized users register websites, web applications, APIs, and repositories; run bounded security checks; prioritize findings; manage remediation; and generate protected HTML, PDF, CSV, and JSON reports.

> **Project status:** MVP for local development, internal QA, and controlled demonstrations. Complete the security, queue-recovery, performance, backup, monitoring, and deployment work listed in [the roadmap](docs/roadmap.md) before offering this service publicly.

## Important: use the correct project folder

Run all commands from the active project root:

```powershell
cd C:\startup
```

This folder contains `start.bat`, `docker-compose.yml`, `apps`, `workers`, and `packages`. A second nested `luminar-securescan` folder is present in the workspace; it is not the project started by the commands documented below.

## Safety and authorization boundary

LuminarIQ SecureScan is built for **authorized, defensive security testing only**.

- Scan only systems you own or for which you have explicit written permission.
- Asset and scan creation require authorization confirmation.
- Default SaaS scanner safety controls reject localhost, cloud metadata endpoints, and private/internal IP ranges.
- HTTP checks use bounded timeouts, redirect limits, response-size limits, and non-destructive methods.
- Findings, reports, logs, and repository results redact sensitive values where supported.
- This product is not a replacement for a full manual penetration test.

## What is included

### Workspace and access

- JWT authentication with bcrypt password hashing.
- Role-aware user and administrator experiences.
- Organizations, members, projects, assets, audit logs, and tenant-scoped data access.
- Subscription plans: **Plus**, **Pro**, and **Max**, with enforced monthly scan and support-request limits.
- Admin views for users, organizations, scans, findings, reports, subscriptions, system health, usage, and audit logs.

### Scanning and findings

- Website baseline checks for HTTPS/redirect behavior, TLS summary, security headers, cookie flags, and limited exposed-file indicators.
- Normalized findings with severity, OWASP mapping, evidence, technical and business impact, remediation, and retest guidance.
- Security score calculation and finding de-duplication.
- Retest handling that marks prior issues as fixed when a later scan no longer detects them.
- API baseline checks using OpenAPI specifications.
- Repository scan foundations for secrets, dependencies, static analysis, Dockerfiles, and configuration checks.
- Optional integrations for OWASP ZAP, Nuclei, and a deliberately constrained sqlmap detection workflow.

### Reports and remediation

- Executive, technical, full audit, and retest report types.
- Protected HTML preview, PDF download, JSON export, and CSV findings export.
- Template-based defensive remediation guidance with examples and retest steps.
- Sensitive-data masking before evidence is exposed in generated reports.

## Architecture

```text
Browser (Next.js, port 3700)
        |
        | /api/backend/* proxy
        v
NestJS API (port 4010) ---- PostgreSQL (host port 55432)
        |                         |
        | BullMQ                  | Prisma
        v                         v
Redis (port 6379) <---- Scanner worker
        |
        +---- OWASP ZAP (port 8080, optional scan mode)
```

The API creates a scan and its jobs in PostgreSQL, queues the work through BullMQ/Redis, and the worker persists normalized findings and a security score. The web application polls the API for scan progress and renders the user or administrator workspace.

## Repository layout

```text
C:\startup
|- apps/
|  |- api/                 NestJS API, Prisma schema, migrations, seed data
|  `- web/                 Next.js dashboard and admin portal
|- workers/scanner/        BullMQ worker and scanner modules
|- packages/shared/        Shared domain types, validation, OpenAPI helpers
|- infra/nginx/            Production reverse-proxy configuration
|- docs/                   Product, API, testing, security, and user documentation
|- docker-compose.yml      Local PostgreSQL, Redis, and ZAP services
|- docker-compose.prod.yml Production service topology
|- .env.example            Environment-variable template
`- start.bat               Windows local startup helper
```

## Technology stack

| Area | Technology |
| --- | --- |
| Web application | Next.js 15, React 19, TypeScript, Tailwind CSS, Zod, React Hook Form, Recharts |
| API | NestJS 10, TypeScript, Prisma, class-validator, JWT, bcrypt, Helmet |
| Data and jobs | PostgreSQL 16, Redis 7, BullMQ |
| Scanner worker | Node.js, TypeScript, Undici, TLS/DNS utilities |
| Optional scanners | OWASP ZAP Docker service, Nuclei binary, sqlmap binary |
| Reporting | HTML templates and Playwright PDF rendering |
| Testing | Vitest, Nest testing utilities, React Testing Library, Playwright |

## Requirements

- Windows 10/11, macOS, or Linux. The provided `start.bat` is for Windows.
- Node.js **20.11 or later**.
- Corepack enabled (included with supported Node.js releases).
- Docker Desktop running with the Linux container engine enabled.
- Git, if cloning from source.

Optional capabilities require their binaries to be installed and available on `PATH`:

- `nuclei` for Nuclei scans.
- `sqlmap` for constrained SQL injection detection scans.

Do not enable optional scanner modes until you have reviewed the authorization and safety requirements in their respective documents.

## First-time local setup (Windows)

1. Open **Docker Desktop** and wait until it reports that the engine is running.
2. Open PowerShell and move to the active root:

   ```powershell
   cd C:\startup
   ```

3. Create local environment files. Keep secrets out of source control:

   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.example apps\api\.env
   ```

4. Edit `apps\api\.env` and replace at least the placeholder values for `JWT_SECRET`, `SENSITIVE_TOKEN_ENCRYPTION_KEY`, `REPOSITORY_TOKEN_ENCRYPTION_KEY`, and `ZAP_API_KEY`. Use long, unique random values.
5. Install dependencies:

   ```powershell
   corepack pnpm install
   ```

6. Start all local services, run safe database migrations, seed the demo data, and open application terminals:

   ```powershell
   .\start.bat --seed
   ```

7. When the **LuminarIQ Web** terminal is ready, open:

   ```text
   http://127.0.0.1:3700
   ```

`start.bat` starts Docker dependencies, applies `prisma migrate deploy`, optionally runs the seed, then starts the API, web app, and scanner worker in separate windows. It will fail before the application starts if Docker Desktop is not running.

For later local starts, without reseeding the database:

```powershell
.\start.bat
```

## Manual local startup

Use these commands if you prefer separate PowerShell windows or need to isolate a service problem.

### 1. Start dependencies

```powershell
cd C:\startup
docker compose up -d
docker compose ps
```

Local Docker services:

| Service | Host address | Purpose |
| --- | --- | --- |
| PostgreSQL | `127.0.0.1:55432` | Application database |
| Redis | `127.0.0.1:6379` | BullMQ queue |
| OWASP ZAP | `127.0.0.1:8080` | Optional ZAP integration |

### 2. Prepare the database

```powershell
corepack pnpm --filter @luminar-iq/api exec prisma migrate deploy
corepack pnpm --filter @luminar-iq/api prisma:seed
```

For schema development only, use `prisma:migrate` to create a named migration. Do not use `prisma migrate dev` against production data.

### 3. Start application services

Open three PowerShell windows in `C:\startup`:

```powershell
corepack pnpm dev:api
```

```powershell
corepack pnpm dev:web
```

```powershell
corepack pnpm dev:worker
```

The worker is required to take queued scans to a terminal state. A healthy worker prints:

```text
{"event":"scanner_worker_ready","queue":"website-scans"}
```

## Local addresses and demo accounts

| Item | Address / credentials |
| --- | --- |
| Web workspace | `http://127.0.0.1:3700` |
| API | `http://127.0.0.1:4010` |

The seed creates a demo organization, project, website asset, completed scan, findings, report metadata, and a **Max** subscription. Seed credentials are for local development only; change or remove them before every non-demo deployment.

## Using the application

### User workflow

1. Register or sign in at `/register` or `/login`.
2. Create an organization, then create a project inside it.
3. Register a website, API, or repository asset.
4. Confirm that you own the target or have explicit authorization to test it.
5. Start a scan and keep the scanner worker running.
6. Review the scan status, security score, jobs, and normalized findings.
7. Update finding status as work progresses; use a new scan to retest fixes.
8. Generate a report from the completed scan and use the protected preview/download/export actions.

### Administrator workflow

1. Sign in from `/admin/login`.
2. Review `/admin/dashboard` for usage and operational health.
3. Inspect customers, organizations, scans, findings, reports, and audit logs.
4. Assign Plus, Pro, or Max plans and review organization usage.
5. Respond to Max-plan fix-support requests in `/admin/fix-requests`.

## Subscription plans

| Plan | Monthly scans | Reports | Fix-support requests |
| --- | ---: | --- | ---: |
| Plus | 3 | Basic summary | 0 |
| Pro | 10 | Detailed technical report | 0 |
| Max | 30 | Detailed technical report | 10 per month |

Max also exposes a daily-scan capability placeholder. Payments are not integrated: an administrator assigns plans manually. See [subscription plans](docs/subscription-plans.md) for enforcement rules and the feature comparison.

## API overview

The web app uses a same-origin proxy at `/api/backend/*`, which forwards to the API on port `4010`. Do not expose database, Redis, report files, or scanner services directly to browsers.

Core authenticated API groups include:

| Group | Base routes |
| --- | --- |
| Authentication | `/auth/register`, `/auth/login`, `/auth/admin/login`, `/auth/me`, `/auth/logout` |
| Workspaces | `/organizations`, `/projects`, `/assets`, `/dashboard/summary` |
| Scans and findings | `/scans`, `/findings` |
| Reports | `/reports`, `/reports/generate`, `/scans/:id/reports` |
| Subscriptions | `/subscriptions/plans`, `/subscriptions/current`, `/subscriptions/usage` |
| Fix support | `/fix-requests`, `/admin/fix-requests` |
| Administration | `/admin` and its protected child routes |

All resource access is JWT protected and tenant-scoped, except registration/login. The exact request and response contracts are in the [REST API specification](docs/rest-api-specification.md).

## Security controls

- Helmet response headers, configured CORS origins, request IDs, structured request logs, and sanitized exception messages.
- bcrypt password hashes; password hashes are not returned by API responses.
- JWT expiry configuration and role-aware API/web route protection.
- DTO validation with unknown properties rejected.
- Organization membership checks for workspace data; administrator guard for platform administration.
- Auth and scan rate-limit configuration.
- Scanner target validation including private-address, localhost, metadata-address, DNS rebinding, redirect, timeout, and response-size controls.
- Per-organization scan concurrency and rate-limit configuration.
- Encrypted sensitive repository/API tokens where those features are used; report and evidence masking.
- Authenticated report files stored outside the Next.js public directory.

Read [the security hardening checklist](docs/security-hardening-checklist.md) before deployment.

## Environment variables

Use `.env.example` as the canonical local template. The API reads `apps/api/.env`; Docker Compose reads the root `.env`.

Important variables:

| Variable | Description |
| --- | --- |
| `API_PORT` / `API_HOST` | API listener; local defaults are `4010` / `0.0.0.0` |
| `WEB_PORT` / `WEB_ORIGIN` | Local web port and allowed browser origins; default web port is `3700` |
| `DATABASE_URL` | PostgreSQL connection URL; local Compose publishes database port `55432` |
| `REDIS_URL` | Redis/BullMQ connection URL |
| `JWT_SECRET` | Required secret for signing access tokens |
| `SENSITIVE_TOKEN_ENCRYPTION_KEY` | Encryption key for sensitive API credentials |
| `REPOSITORY_TOKEN_ENCRYPTION_KEY` | Encryption key for repository tokens |
| `SCANNER_ALLOWED_PRIVATE_NETWORKS` | Keep `false` for SaaS-hosted scanning |
| `REPORTS_ENABLED` / `REPORT_STORAGE_PATH` | Report generation and private storage controls |
| `ZAP_*`, `NUCLEI_*`, `SQLMAP_*` | Optional scanner integration settings |

Never commit real credentials, API keys, certificates, report files, or database dumps.

## Testing and quality checks

Run all package unit tests:

```powershell
corepack pnpm test
```

Run type checks/linting:

```powershell
corepack pnpm lint
```

Build all packages:

```powershell
corepack pnpm build
```

Run focused tests:

```powershell
corepack pnpm --filter @luminar-iq/api test
corepack pnpm --filter @luminar-iq/api test:integration
corepack pnpm --filter @luminar-iq/scanner-worker test
corepack pnpm --filter @luminar-iq/web test
corepack pnpm --filter @luminar-iq/web test:e2e
```

The API database integration suite requires a dedicated `TEST_DATABASE_URL`; it should never point at a development or production database. Full testing guidance and release gaps are in [the test strategy](docs/test-strategy.md) and [test execution report](docs/test-execution-report.md).

## Production deployment

`docker-compose.prod.yml` describes the intended production service topology: web, API, worker, PostgreSQL, Redis, and Nginx. It expects pre-built API/web/worker images, production secrets, Redis and PostgreSQL passwords, TLS certificates under `certs/`, and a reviewed Nginx configuration.

Before any production launch:

1. Replace all development secrets and demo credentials.
2. Configure a real domain, HTTPS certificates, trusted proxy settings, and strict `WEB_ORIGIN` values.
3. Build and publish immutable images, then run migrations as a controlled deploy step.
4. Configure backups, log retention, monitoring, error tracking, and queue-failure alerts.
5. Validate rate limiting, tenant isolation, SSRF protections, report authorization, and scanner safety in a staging environment.
6. Complete database/Redis integration and performance testing at expected workload.

See [the software design document](docs/software-design-document.md), [developer guide](docs/developer-guide.md), and [compliance placeholders](docs/compliance-readiness-placeholders.md).

## Troubleshooting

### Docker cannot connect or `docker compose up` fails

Start Docker Desktop and wait until **Engine running** appears. Verify it with:

```powershell
docker info
docker compose ps
```

Then retry:

```powershell
cd C:\startup
docker compose up -d
```

### Website port `3700` or API port `4010` is already in use

Find the process:

```powershell
netstat -ano | findstr :3700
netstat -ano | findstr :4010
```

Close the older development terminal, or stop its process only after confirming it is not needed:

```powershell
Stop-Process -Id <PID>
```

### Login reports that the API cannot be reached

Ensure both `corepack pnpm dev:api` and `corepack pnpm dev:web` are running. Browse to `http://127.0.0.1:3700`, not an old `localhost:3010` address. Clear the browser cache or use an InPrivate window after changing environment settings.

### Prisma migration or seed fails with database authentication errors

Confirm the local Docker database is healthy and that `apps/api/.env` contains the same `DATABASE_URL` as the local setup:

```text
postgresql://securescan:securescan@127.0.0.1:55432/securescan
```

If you intentionally changed PostgreSQL credentials, update both the Docker/root environment and `apps/api/.env` to match. Do not delete Docker volumes unless you intentionally want to discard all local data.

### A scan remains queued or fails

Keep Redis and the worker running:

```powershell
docker compose ps
corepack pnpm dev:worker
```

Review worker logs for the affected scan job. ZAP, Nuclei, and sqlmap scans can fail when their service/binary is unavailable, their credentials are invalid, or their configured timeout is exceeded. Baseline scanning remains subject to target-safety rules.

## Documentation index

- [Project usage guide](docs/project-usage-guide.md)
- [User guide](docs/user-guide.md)
- [Developer guide](docs/developer-guide.md)
- [REST API specification](docs/rest-api-specification.md)
- [Software design document](docs/software-design-document.md)
- [Product requirements document](docs/product-requirements-document.md)
- [Report generation guide](docs/report-generation.md)
- [Subscription plan guide](docs/subscription-plans.md)
- [OWASP ZAP integration](docs/owasp-zap-integration.md)
- [Nuclei integration](docs/nuclei-integration.md)
- [sqlmap integration](docs/sqlmap-integration.md)
- [Test strategy](docs/test-strategy.md)
- [Security hardening checklist](docs/security-hardening-checklist.md)
- [Roadmap](docs/roadmap.md)

## License and support

No open-source license file was found in this repository. Confirm licensing and distribution terms with LuminarIQ SoftSol Pvt. Ltd. before sharing or deploying this code outside the intended team.

For security concerns, use the configured security contact address rather than including sensitive evidence in ordinary support requests.
