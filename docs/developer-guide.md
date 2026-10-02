# LuminarIQ SecureScan Developer Guide

## 1. Local Development Setup

Prerequisites:

- Node.js 20.11 or newer
- Corepack enabled
- pnpm 9+
- Docker Desktop
- Git

Install dependencies from the repository root:

```bash
corepack enable
corepack pnpm install
```

Create API environment file:

```powershell
Copy-Item .env.example apps\api\.env
```

Start local infrastructure:

```bash
docker compose up -d postgres redis
```

Run migrations and seed data:

```bash
corepack pnpm --filter @luminar-iq/api prisma:migrate
corepack pnpm --filter @luminar-iq/api prisma:seed
```

Default demo login:

- Email: `vishal@example.com`
- Password: `User@123`

## 2. Repository Structure

```text
.
├── apps
│   ├── api              # NestJS backend and Prisma schema
│   └── web              # Next.js frontend
├── docs                 # Product, design, API, QA, and user docs
├── infra                # Infrastructure placeholders
├── packages
│   └── shared           # Shared domain contracts and parsers
├── workers
│   └── scanner          # BullMQ scanner worker and scanner modules
├── docker-compose.yml   # Local PostgreSQL, Redis, OWASP ZAP
├── package.json         # Workspace scripts
└── pnpm-workspace.yaml
```

Key paths:

- API modules: `apps/api/src/modules`
- Prisma schema: `apps/api/prisma/schema.prisma`
- Seed data: `apps/api/prisma/seed.ts`
- Web pages: `apps/web/src/app`
- Web shared UI: `apps/web/src/components`
- Worker scanner modules: `workers/scanner/src/modules`
- Finding engine: `workers/scanner/src/finding-normalization.ts`
- Recommendation engine: `workers/scanner/src/recommendation-engine.ts`

## 3. Environment Variables

Primary environment file:

- `apps/api/.env`

Common variables:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | Runtime mode |
| `API_PORT` | API port, default `4000` |
| `WEB_PORT` | Web port, default `3000` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiration |
| `REPOSITORY_TOKEN_ENCRYPTION_KEY` | Encryption key for transient repository tokens |
| `SCANNER_ALLOWED_PRIVATE_NETWORKS` | Allows private/internal scan targets when `true` |
| `REPORT_STORAGE_DIR` | Report storage path placeholder |
| `ZAP_API_URL` | OWASP ZAP API URL |
| `ZAP_API_KEY` | OWASP ZAP API key |
| `ZAP_SCAN_TIMEOUT` | ZAP scan timeout |
| `OPENAPI_FETCH_TIMEOUT_MS` | OpenAPI URL fetch timeout |
| `OPENAPI_MAX_SPEC_BYTES` | Max OpenAPI spec size |
| `REPO_ZIP_MAX_BYTES` | Max repository ZIP upload size |
| `REPO_SCAN_MAX_FILE_BYTES` | Max file size read during repo scan |
| `REPO_SCAN_MAX_FILES` | Max files inspected during repo scan |
| `REPO_TOOL_TIMEOUT_MS` | External repository tool timeout |

Do not commit real secrets.

## 4. Running with Docker Compose

Start PostgreSQL and Redis:

```bash
docker compose up -d postgres redis
```

Start OWASP ZAP too:

```bash
docker compose up -d postgres redis zap
```

Check service health:

```bash
docker compose ps
```

Reset local development database:

```bash
docker compose down -v
docker compose up -d postgres redis
```

Warning: `docker compose down -v` deletes local PostgreSQL data for this project.

## 5. Running Frontend Locally

From the repository root:

```bash
corepack pnpm dev:web
```

Default URL:

```text
http://localhost:3000
```

If the frontend cannot reach the API, confirm:

- API is running on `http://localhost:4010`.
- `NEXT_PUBLIC_API_URL` is set if using a non-default API URL.
- Browser local storage has a valid token after login.

## 6. Running Backend Locally

From the repository root:

```bash
corepack pnpm dev:api
```

Default URL:

```text
http://localhost:4010
```

Before starting the API:

```bash
docker compose up -d postgres redis
corepack pnpm --filter @luminar-iq/api prisma:migrate
```

## 7. Running Worker Locally

From the repository root:

```bash
corepack pnpm dev:worker
```

The worker needs:

- `DATABASE_URL`
- `REDIS_URL`
- Scanner-related env vars
- Optional external tools for repository scanning: `git`, `tar`, `gitleaks`, `semgrep`, `trivy`, `npm`

The worker consumes BullMQ jobs from the `website-scans` queue.

## 8. Database Migration Commands

Generate Prisma client:

```bash
corepack pnpm --filter @luminar-iq/api prisma:generate
```

Create/apply local migration:

```bash
corepack pnpm --filter @luminar-iq/api prisma:migrate
```

Apply migrations in CI/production should use Prisma deploy command if added later:

```bash
prisma migrate deploy
```

## 9. Seed Data Commands

Seed local demo data:

```bash
corepack pnpm --filter @luminar-iq/api prisma:seed
```

Seed creates:

- Demo user
- Demo organization
- Demo project
- Demo website asset
- Completed demo scan
- Sample findings
- Sample report metadata

## 10. Test Commands

Run all workspace tests:

```bash
corepack pnpm test
```

Run API tests:

```bash
corepack pnpm --filter @luminar-iq/api test
```

Run API integration tests:

```bash
corepack pnpm --filter @luminar-iq/api test:integration
```

Integration tests require a safe `TEST_DATABASE_URL` containing `test`.

Run worker tests:

```bash
corepack pnpm --filter @luminar-iq/scanner-worker test
```

Run frontend unit tests:

```bash
corepack pnpm --filter @luminar-iq/web test
```

Run frontend Playwright tests:

```bash
corepack pnpm --filter @luminar-iq/web test:e2e
```

## 11. Linting and Formatting

Run TypeScript checks across the workspace:

```bash
corepack pnpm lint
```

Run package-specific checks:

```bash
corepack pnpm --filter @luminar-iq/api lint
corepack pnpm --filter @luminar-iq/web lint
corepack pnpm --filter @luminar-iq/scanner-worker lint
corepack pnpm --filter @luminar-iq/shared lint
```

Current linting is TypeScript `--noEmit`. If a formatter is added later, prefer a single workspace command such as:

```bash
corepack pnpm format
```

## 12. Adding a New Scanner Module

Scanner modules live in:

```text
workers/scanner/src/modules
```

Each scanner module should:

- Export a `ScannerModule`.
- Use safe, defensive checks only.
- Apply timeouts.
- Avoid destructive actions.
- Return normalized findings.
- Include unit tests.
- Avoid leaking secrets.

Scanner module interface example:

```ts
import type { ScannerModule } from "../types";
import { makeFinding } from "../finding-factory";

export const exampleSecurityCheck: ScannerModule = {
  jobType: "EXAMPLE_SECURITY_CHECK",
  async run(target, context) {
    const findings = [];

    if (!target.startsWith("https://")) {
      findings.push(makeFinding({
        title: "Example finding",
        description: "The asset did not meet the example condition.",
        severity: "LOW",
        category: "Security Misconfiguration",
        affectedUrl: target,
        evidenceSummary: "Example evidence.",
        businessImpact: "This may increase operational risk.",
        technicalImpact: "The expected security control was not observed.",
        remediationSummary: "Enable the expected security control.",
        retestSteps: "Run the scan again and confirm the finding is absent.",
        owaspMapping: ["Security Misconfiguration"],
        evidenceType: "EXAMPLE",
        observedValue: "Missing",
        expectedValue: "Present",
        recommendationType: "EXAMPLE_REMEDIATION",
      }));
    }

    return findings;
  },
};
```

Register the module in:

```text
workers/scanner/src/modules/index.ts
```

Add a scan job type in API scan creation logic if the check should be scheduled.

## 13. Adding a New Finding Template

Recommendation templates live in:

```text
workers/scanner/src/recommendation-engine.ts
```

Recommendation template example:

```ts
const missingExampleHeaderTemplate = {
  match: (finding: FindingContext) =>
    finding.title.toLowerCase().includes("example header"),
  build: (finding: FindingContext) => ({
    recommendationType: "EXAMPLE_HEADER",
    remediationText:
      "Add the Example-Security-Header response header with a reviewed production value.",
    codeExample:
      "add_header Example-Security-Header \"enabled\" always;",
    retestSteps:
      "Request the affected URL and confirm Example-Security-Header is present.",
  }),
};
```

Rules:

- Keep output defensive.
- Do not include exploit payloads.
- Cite or reference scanner evidence.
- Add unit tests for the template.

## 14. Adding a New Severity Rule

Severity logic belongs in the finding normalization and scoring layer:

```text
workers/scanner/src/finding-normalization.ts
```

Severity rule example:

```ts
export function scoreSeverity(input: {
  sensitiveDataExposure?: boolean;
  authenticationImpact?: boolean;
  internetFacing?: boolean;
}) {
  if (input.sensitiveDataExposure && input.internetFacing) return "CRITICAL";
  if (input.authenticationImpact) return "HIGH";
  return "MEDIUM";
}
```

When adding severity logic:

- Keep rules deterministic.
- Add tests for each branch.
- Avoid changing existing score behavior without updating reports and dashboards.
- Document changes in release notes if severity behavior changes.

## 15. Adding a New Report Section

Report generation lives in:

```text
apps/api/src/modules/reports/reports.service.ts
```

Add a helper method for the section:

```ts
private renderComplianceSection(scan: ReportScan) {
  return `<section class="page">
    <h2>Compliance Mapping</h2>
    <p>This section summarizes mapped OWASP and CWE references.</p>
  </section>`;
}
```

Then include it in the section list for the relevant report type:

```ts
const sections = [
  this.renderCover(scan, reportType, generatedAt, summary),
  this.renderExecutiveSection(scan, summary),
  this.renderTechnicalSection(scan, summary),
  this.renderComplianceSection(scan),
].join("");
```

Report section guidelines:

- Escape all user-controlled text.
- Keep layout print-friendly.
- Avoid leaking raw secrets.
- Add unit tests for the section.
- Check generated PDF output.

## 16. Adding a New API Endpoint

Backend modules follow this pattern:

- DTO for validation
- Controller method
- Service method
- Repository method if database access is needed
- Tests
- Audit log for mutations

API controller pattern:

```ts
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { ExampleService } from "./example.service";
import { CreateExampleDto } from "./dto/create-example.dto";

@Controller("examples")
@UseGuards(JwtAuthGuard)
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Post()
  create(@Body() dto: CreateExampleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
```

Endpoint checklist:

- Validate inputs.
- Enforce tenant access.
- Return safe errors.
- Avoid exposing secrets.
- Add controller/service tests.
- Update REST API specification if public.

## 17. Frontend Coding Standards

Frontend rules:

- Use App Router pages in `apps/web/src/app`.
- Use shared UI components from `apps/web/src/components`.
- Use `apiRequest` or `apiResponse` from `apps/web/src/lib/api`.
- Use Zod for complex form validation.
- Always implement loading, error, and empty states.
- Keep text clear and business-friendly.
- Avoid exposing raw secrets in the UI.
- Use responsive layouts for desktop and tablet.

Frontend API client usage:

```ts
import { apiRequest } from "../lib/api";

type Scan = {
  id: string;
  status: string;
  securityScore?: number | string | null;
};

async function loadScan(scanId: string) {
  return apiRequest<Scan>(`/scans/${scanId}`);
}
```

Mutation example:

```ts
await apiRequest("/findings/finding-id/status", {
  method: "PATCH",
  body: JSON.stringify({ status: "FIXED" }),
});
```

## 18. Backend Coding Standards

Backend rules:

- Keep controllers thin.
- Put business rules in services.
- Put Prisma query details in repositories where a repository exists.
- Use DTOs and class-validator.
- Throw NestJS exceptions, not raw strings.
- Scope all tenant data by authenticated user.
- Never return password hashes.
- Add audit logs for important mutations.

Service pattern:

```ts
async findById(id: string, userId: string) {
  const record = await this.repository.findByIdForUser(id, userId);
  if (!record) throw new NotFoundException("Record not found.");
  return record;
}
```

## 19. Worker Coding Standards

Worker rules:

- Scanner modules must be deterministic and testable.
- Mock external HTTP calls in tests.
- Do not perform destructive requests.
- Limit response body sizes.
- Use timeouts.
- Catch module failures and continue when safe.
- Log structured events.
- Clean up temporary files.
- Redact secrets.

Finding normalization example:

```ts
import { makeFinding } from "./finding-factory";

const finding = makeFinding({
  title: "Strict-Transport-Security header is missing",
  description: "The site does not instruct browsers to require HTTPS.",
  severity: "MEDIUM",
  category: "Security Headers",
  affectedUrl: "https://example.com",
  evidenceSummary: "No Strict-Transport-Security header was observed.",
  businessImpact: "Users may be exposed to downgrade risk.",
  technicalImpact: "Browsers are not instructed to enforce HTTPS.",
  remediationSummary: "Add an HSTS header after validating HTTPS.",
  retestSteps: "Request the URL and confirm the HSTS header is present.",
  owaspMapping: ["Security Misconfiguration"],
  evidenceType: "RESPONSE_HEADER",
  observedValue: "Header absent",
  expectedValue: "Strict-Transport-Security present",
  recommendationType: "MISSING_HSTS",
});
```

## 20. Security Coding Guidelines

Always:

- Validate input.
- Enforce organization membership.
- Treat scanner targets as untrusted.
- Block private/internal scan targets by default.
- Redact secret-like values.
- Avoid storing plaintext transient tokens.
- Escape HTML in reports.
- Use parameterized/ORM queries.
- Keep logs free of secrets.

Never:

- Return password hashes.
- Log bearer tokens.
- Put repository tokens in URLs or command arguments.
- Add active exploitation payloads to scanners.
- Scan third-party systems without authorization.

## 21. Logging Standards

Use structured logs for worker lifecycle events:

```ts
console.info(JSON.stringify({
  event: "scan_check_completed",
  scanId,
  jobType: module.jobType,
  findings: moduleFindings.length,
}));
```

Recommended fields:

- `event`
- `scanId`
- `assetId`
- `jobType`
- `status`
- `durationMs`
- `error`

Do not log:

- Passwords
- JWTs
- API bearer tokens
- Repository tokens
- Full secret values from scanner evidence

## 22. Error Handling Standards

API:

- Use `BadRequestException` for validation/business rule failures.
- Use `UnauthorizedException` for auth failures.
- Use `ForbiddenException` for role failures.
- Use `NotFoundException` for missing or inaccessible resources.
- Use `ServiceUnavailableException` for queue/service outages.

Worker:

- Catch scanner module errors.
- Mark failed `ScanJob` rows.
- Continue remaining checks where safe.
- Mark scan failed only when the overall scan cannot complete.

Frontend:

- Show user-safe error messages.
- Disable buttons during mutations.
- Do not display stack traces.

## 23. Pull Request Checklist

Before opening a PR:

- Code builds locally.
- Relevant unit tests pass.
- E2E tests pass for UI changes.
- Prisma migration added for schema changes.
- Seed data updated if needed.
- API docs updated for endpoint changes.
- PRD/SDD updated for significant design changes.
- No secrets committed.
- Tenant authorization checked.
- Error and loading states implemented.
- Audit logs added for sensitive mutations.

Recommended commands:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @luminar-iq/web test:e2e
```

## 24. Release Process

Suggested release flow:

1. Merge only after CI passes.
2. Run database migrations in staging.
3. Seed or migrate required reference data.
4. Run smoke tests.
5. Run Playwright E2E tests.
6. Generate sample reports.
7. Verify worker queue processing.
8. Review security configuration.
9. Tag release.
10. Deploy API, web, and worker.
11. Monitor logs and queue depth.

Release checklist:

- `JWT_SECRET` configured.
- `DATABASE_URL` configured.
- `REDIS_URL` configured.
- `REPOSITORY_TOKEN_ENCRYPTION_KEY` configured.
- Private network scanning disabled unless explicitly intended.
- Docker services healthy.
- Worker running.
- ZAP configured if enabled.

## 25. Troubleshooting

### Prisma cannot find `DATABASE_URL`

Create `apps/api/.env`:

```powershell
Copy-Item .env.example apps\api\.env
```

### Postgres authentication failed

The Docker volume may have old credentials. For local demo data only:

```bash
docker compose down -v
docker compose up -d postgres redis
corepack pnpm --filter @luminar-iq/api prisma:migrate
corepack pnpm --filter @luminar-iq/api prisma:seed
```

### Docker cannot pull Redis/Postgres

Make sure Docker Desktop is running and the Docker engine is healthy:

```bash
docker compose ps
```

### Login fails for demo user

Run seed:

```bash
corepack pnpm --filter @luminar-iq/api prisma:seed
```

Then use:

- `vishal@example.com`
- `User@123`

### Scan stays queued

Check:

- Redis is running.
- Worker is running.
- API and worker use the same `REDIS_URL`.
- Worker can connect to PostgreSQL.

### ZAP scan fails

Check:

```bash
docker compose up -d zap
```

Confirm:

- `ZAP_API_URL`
- `ZAP_API_KEY`
- ZAP container health

### Repository scan produces fewer results than expected

Check whether tools are installed:

- `gitleaks`
- `semgrep`
- `trivy`
- `npm`
- `git`
- `tar`

The scanner skips unavailable optional tools and still runs built-in checks.

### Playwright tests are flaky

The repo config uses one worker for deterministic local Next.js dev-server E2E runs. If needed:

```bash
corepack pnpm --filter @luminar-iq/web test:e2e
```

Check Playwright traces in the generated test results directory.
