# LuminarIQ SecureScan Test Strategy

## Purpose

LuminarIQ SecureScan is a defensive SaaS security audit platform. The test strategy must prove that the product is reliable, tenant-safe, and careful with sensitive security evidence. Testing should cover the Next.js frontend, NestJS API, PostgreSQL persistence, Redis/BullMQ scan orchestration, scanner worker checks, findings normalization, report generation, and remediation templates.

The strategy uses a test pyramid:

- Unit tests for fast feedback on services, components, scanners, scoring, and templates.
- Integration tests for API, database, queue, worker, and report workflows.
- End-to-end tests for critical user journeys.
- Security and regression suites as release blockers.
- Performance tests on scheduled or pre-release pipelines.

## Priority Levels

| Priority | Meaning | Release Impact |
| --- | --- | --- |
| P0 | Critical user path, tenant isolation, security control, or scanner safety behavior | Must pass before merge/release |
| P1 | Important workflow or regression protection | Must pass before release |
| P2 | Scale, edge case, or lower-risk coverage | Run nightly or before major release |
| P3 | Manual exploratory, visual review, or periodic validation | Run as needed |

## Tools

| Layer | Recommended Tools |
| --- | --- |
| Frontend unit/component | Vitest, React Testing Library, Testing Library user-event |
| Backend unit | Vitest, NestJS testing utilities |
| API integration | Vitest, Supertest, Prisma test database |
| Database integration | Prisma, PostgreSQL test container or dedicated `TEST_DATABASE_URL` |
| Queue/worker integration | Redis test container, BullMQ, worker test harness |
| E2E | Playwright |
| Scanner mocks | Local HTTP/HTTPS test servers, mocked command runners, fixture outputs |
| Report testing | HTML snapshot assertions, PDF response validation, Playwright/Puppeteer renderer smoke tests |
| Coverage | Vitest coverage with v8/c8 provider |
| CI | GitHub Actions or equivalent |

## Coverage Goals

| Area | Goal |
| --- | ---: |
| Backend services and guards | 85%+ line coverage |
| Scanner modules | 90%+ branch coverage |
| Findings normalization and severity engine | 95%+ branch coverage |
| Recommendation engine templates | 100% supported-template coverage |
| Report service | 85%+ branch coverage |
| Frontend critical components and forms | 75%+ meaningful component coverage |
| E2E critical user journeys | 100% P0 journey coverage |

Coverage should be used as a guardrail, not a substitute for risk-based test quality.

## Unit Testing Strategy

Unit tests must be deterministic, fast, and independent of Docker. Mock external network, Redis, Prisma, filesystem cleanup, scanner command execution, ZAP, OpenAPI URLs, and PDF rendering unless the test is explicitly integration-level.

| Area | Test Cases | Priority | Automation |
| --- | --- | --- | --- |
| Frontend login/register | Required fields, invalid email, short password, API error, loading state | P0 | Vitest + Testing Library |
| Frontend protected shell | Missing token redirects, failed `/auth/me` clears token, authenticated user renders nav | P0 | Vitest |
| Frontend asset forms | Website/API/repository validation, OpenAPI parse errors, file upload states | P0 | Vitest |
| Frontend dashboard | Score card, severity cards, latest scan status, empty/loading/error states | P1 | Vitest |
| Frontend scan modal | Authorization checkbox required, ZAP toggle, API scope selection, repository token/ZIP fields | P0 | Vitest |
| Backend auth service | Password hashing, login success/failure, inactive user rejection, password hash hidden | P0 | Vitest |
| JWT guard | Valid token accepted, missing/malformed/expired token rejected | P0 | Vitest |
| Organization service | Create organization, slug normalization, owner membership | P0 | Vitest |
| Project service | Create/list/get within membership, reject cross-tenant access | P0 | Vitest |
| Asset service | Create website/API/repository assets, OpenAPI storage, validation failures | P0 | Vitest |
| Scan service | Authorization confirmation required, job creation, API asset validation, repository token encryption | P0 | Vitest |
| Scanner modules | HTTPS, headers, cookies, exposed files, TLS, API, ZAP, repository checks with mocks | P0 | Vitest |
| Severity engine | Factor mapping, score penalties, counts, minimum score 0, risk trend placeholder | P0 | Vitest |
| Finding normalization | Required fields, OWASP mapping, default `OPEN`, dedupe keys, affected URL evidence | P0 | Vitest |
| Recommendation engine | Every supported template, safe wording, defensive-only guardrails, code examples | P0 | Vitest |
| Report service | Executive/technical/full sections, severity legend, evidence rendering, fallback PDF | P1 | Vitest |

## Integration Testing Strategy

Integration tests should run against real PostgreSQL and Redis. Use a dedicated database URL containing `test`, or test containers. Tests must create isolated data per run and clean it up.

| Area | Test Cases | Priority | Automation |
| --- | --- | --- | --- |
| Auth flow | Register, login, `/auth/me`, wrong password, duplicate email | P0 | Supertest + PostgreSQL |
| Organization/project/asset flow | Create organization, project, website asset, list/get all resources | P0 | Supertest |
| Tenant authorization | User B cannot access User A org/project/asset/scan/finding/report | P0 | Supertest |
| Scan creation | `POST /scans` creates scan, scan jobs, summary JSON, audit log | P0 | Supertest + DB assertions |
| Worker job execution | BullMQ job picked up, scan moves `QUEUED` to `RUNNING` to `COMPLETED` | P1 | Redis + worker harness |
| Failed worker check | One check fails, job marked failed, scan still completes when possible | P0 | Worker integration |
| Findings persistence | Normalized findings create finding, evidence, recommendation records | P0 | Worker + DB |
| Retest persistence | Previously detected finding is marked `FIXED` when absent in new scan | P0 | Worker + DB |
| Report generation | Generate executive/technical/full report, store metadata, download PDF | P1 | Supertest |
| Database relationships | User to organization to project to asset to scan to findings graph | P1 | Prisma integration |
| Repository scan token | Token stored encrypted in queue payload and never in DB summary | P0 | API integration |

## End-To-End Testing Strategy

E2E tests should cover the user-visible happy path and critical denial paths. Run against local API, web, PostgreSQL, Redis, and a safe local vulnerable test website. Keep E2E tests fewer than unit/integration tests, but make them high confidence.

| Journey | Steps | Priority | Automation |
| --- | --- | --- | --- |
| Register user | Open register, submit valid data, lands in dashboard | P0 | Playwright |
| Login | Seed user, login, dashboard renders workspace state | P0 | Playwright |
| Create workspace | Create organization, create project, verify project page | P0 | Playwright |
| Add website asset | Add asset URL, verify project and asset detail pages | P0 | Playwright |
| Start scan | Open asset, click Start Scan, require authorization checkbox, queue scan | P0 | Playwright |
| View scan status | Progress page shows queued/running/completed states | P1 | Playwright |
| View findings | Scan detail shows finding table, severity/status filters work | P1 | Playwright |
| Finding detail | Open finding, view evidence, impact, remediation, update status | P1 | Playwright |
| Generate report | Click export/generate report, report appears on reports page | P1 | Playwright |
| Download report | Download endpoint returns PDF with expected content type | P1 | Playwright |
| Unauthorized access | Logout, direct dashboard/asset/scan/report URL redirects to login | P0 | Playwright |

## Security Testing Strategy

Security tests are release blockers for a security product. They should be automated where possible and reviewed whenever auth, tenant access, scan target validation, report access, or evidence handling changes.

| Risk | Test Cases | Priority | Automation |
| --- | --- | --- | --- |
| Auth bypass | No token, malformed token, expired token, wrong signature rejected | P0 | Supertest |
| Organization isolation | Cross-user access denied for orgs, projects, assets, scans, findings, reports | P0 | Supertest |
| JWT validation | Secret comes from env, invalid secret/token mismatch fails | P0 | Unit/integration |
| Password exposure | `passwordHash` never appears in auth responses or user API payloads | P0 | Unit/integration |
| Input validation | Invalid UUIDs, URLs, scan types, OpenAPI specs, repository branches, oversized ZIPs rejected | P0 | Supertest |
| SSRF protection | Block localhost, `127.0.0.1`, `::1`, metadata IPs, private ranges by default | P0 | Scanner unit/integration |
| Private IP scan blocking | SaaS-hosted website/ZAP/API scans cannot target private/internal addresses | P0 | Scanner tests |
| Rate limiting | Auth routes enforce or expose rate-limit middleware behavior | P1 | Supertest |
| Sensitive data masking | Secrets redacted in findings, reports, UI, logs, repository scanner evidence | P0 | Unit/integration |
| Report authorization | User cannot fetch or download another organization report | P0 | Supertest |
| Repository tokens | Tokens are not stored plaintext in DB, logs, reports, or queue payloads | P0 | Unit/integration |
| Scanner safety | No destructive HTTP methods, no aggressive crawling, response/body limits honored | P0 | Scanner tests |

## Scanner Testing Matrix

Scanner tests should use local mock servers and mocked command outputs. Automated tests must never scan third-party targets.

| Scenario | Expected Result | Priority | Automation |
| --- | --- | --- | --- |
| HTTPS enabled | No missing HTTPS finding | P0 | Mock HTTPS server |
| HTTP only | High severity no-HTTPS finding with remediation | P0 | Mock HTTP server |
| HTTP to HTTPS redirect | Redirect evidence captured, no false HTTP-only finding | P0 | Mock redirect server |
| Missing security headers | Missing CSP/HSTS/etc. findings with expected severities | P0 | Mock response headers |
| Secure headers present | No missing-header findings | P0 | Mock response headers |
| Cookie missing Secure | High severity on HTTPS asset | P0 | Mock `Set-Cookie` |
| Cookie missing HttpOnly | Medium severity finding | P0 | Mock `Set-Cookie` |
| Cookie missing SameSite | Medium/Low finding per policy | P1 | Mock `Set-Cookie` |
| Cookies with proper flags | No cookie-security finding | P0 | Mock `Set-Cookie` |
| Exposed `.env` | Critical finding, body limited, evidence redacted | P0 | Mock path |
| Exposed `.git/config` | Critical finding, no large download | P0 | Mock path |
| Exposed backup file | High/Critical finding based on policy, no full download | P1 | Mock HEAD/GET |
| Expired TLS cert | High severity certificate finding | P0 | TLS mock or certificate adapter mock |
| Expiring TLS cert | Medium/Low warning with days remaining | P1 | TLS adapter mock |
| Timeout handling | Check fails gracefully, scan continues | P0 | Delayed server |
| Redirect loops | Error captured, no worker crash | P0 | Redirect loop server |
| Large response handling | Body truncated and max-size limit enforced | P0 | Large response server |
| ZAP baseline alerts | ZAP risk levels map to platform severities | P1 | Mock ZAP API |
| API baseline | Safe HEAD/OPTIONS only, no destructive methods | P0 | Mock API server |
| Repository scanner | Gitleaks/Semgrep/Trivy/npm outputs normalize and redact | P0 | Mock command runner |

## Performance Testing Strategy

Performance tests should be scheduled nightly and before release. They should not block every small PR unless the changed area is performance-sensitive.

| Scenario | Target | Priority | Automation |
| --- | --- | --- | --- |
| Multiple scans queued | 50-100 scans queue without lost jobs | P1 | k6/custom script + Redis |
| Worker concurrency | Honors configured concurrency and avoids DB race corruption | P1 | Worker load test |
| Large findings set | Scan detail and findings API handle 1,000+ findings | P2 | Seeded DB test |
| Report generation time | Full report for 100 findings completes within agreed SLA, for example <10s locally | P1 | Integration/perf test |
| Dashboard query performance | P95 response under target with seeded org/project/asset/finding data | P2 | API perf test |
| Frontend route load | Dashboard and scan detail render within target on seeded data | P2 | Playwright trace |

## Regression Testing Strategy

Regression tests protect product trust: duplicate findings, score instability, and broken retesting can make security posture reporting misleading.

| Area | Test Cases | Priority | Automation |
| --- | --- | --- | --- |
| Previously fixed findings | Prior finding marked `FIXED` when not detected in later scan | P0 | Worker integration |
| Retest workflow | `RETEST_REQUIRED` can move to `FIXED` or remain open based on new evidence | P1 | Integration |
| Finding deduplication | Same scan/asset/title/affected URL/evidence creates one finding | P0 | Unit/integration |
| Score consistency | Same finding set always produces same score and severity counts | P0 | Unit |
| Recommendation consistency | Same finding type gets same deterministic template output | P1 | Unit |
| Report stability | Existing findings render in reports after template/layout changes | P1 | Snapshot/unit |
| Authorization regression | Cross-tenant routes remain denied after service refactors | P0 | Integration |

## Test Data Strategy

Use safe, deterministic data. Never point automated scanners at public third-party websites.

### Seed Data

| Data | Purpose |
| --- | --- |
| Demo user | Login and dashboard smoke tests |
| Demo organization | Workspace and tenant relationship tests |
| Demo projects | Project list/detail and project-scoped asset tests |
| Demo website asset | Website baseline scan and report generation |
| Demo findings | Dashboard counts, finding detail, report rendering |

### Safe Local Vulnerable Website

Create a local-only test server with routes for:

- HTTP-only response.
- HTTP to HTTPS redirect.
- Missing security headers.
- Secure headers present.
- Cookie missing `Secure`.
- Cookie missing `HttpOnly`.
- Cookie missing `SameSite`.
- Properly hardened cookies.
- Public `/.env` mock with fake secrets.
- Public `/.git/config` mock.
- Large response body.
- Timeout response.
- Redirect loop.

All secrets must be fake and obviously non-production, for example `FAKE_API_KEY=demo-not-real`.

### Mock Outputs

Maintain fixtures for:

- Gitleaks JSON output with redacted secret expectation.
- Semgrep JSON output.
- Trivy config/vulnerability output.
- npm audit output.
- ZAP alerts.
- OpenAPI JSON/YAML specs, valid and invalid.
- PDF/report HTML fixture scans.

## Automation Recommendation

Automate all P0 and P1 tests. P2 tests should run nightly or before release. P3 checks can remain manual until they become frequent regressions.

Recommended command groups:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
corepack pnpm --filter @luminar-iq/api test:integration
corepack pnpm --filter @luminar-iq/web test:e2e
```

For local development, run the narrow package tests first:

```bash
corepack pnpm --filter @luminar-iq/api test
corepack pnpm --filter @luminar-iq/scanner-worker test
corepack pnpm --filter @luminar-iq/web test
```

## CI/CD Pipeline Recommendation

### Pull Request Pipeline

1. Checkout code.
2. Setup Node and pnpm.
3. Install dependencies.
4. Generate Prisma client.
5. Run TypeScript checks and lint scripts.
6. Run unit tests for shared, API, worker, and web.
7. Build shared, API, worker, and web.
8. Start PostgreSQL and Redis services.
9. Run migrations against test database.
10. Run P0 integration tests.
11. Start API, worker, web, and local vulnerable test server.
12. Run P0 Playwright E2E tests.
13. Upload coverage, Playwright traces, screenshots, logs, and generated report artifacts.

### Nightly Pipeline

1. Run full PR pipeline.
2. Run all P1/P2 integration tests.
3. Run scanner edge-case suite.
4. Run performance tests with seeded large datasets.
5. Run report generation stress tests.
6. Run dependency audit and repository scanner fixture suite.

### Release Pipeline

1. Full PR pipeline.
2. Full security test suite.
3. Cross-tenant authorization suite.
4. Sensitive data masking suite.
5. Worker queue reliability suite.
6. Report generation/download suite.
7. Manual review of generated executive and technical report samples.

## Quality Gates

| Gate | Requirement |
| --- | --- |
| PR merge | All P0 unit, integration, and E2E tests pass |
| Release candidate | All P0/P1 tests pass |
| Security-sensitive change | Auth, tenant isolation, SSRF, masking, and scanner safety tests pass |
| Scanner change | Scanner module unit tests plus local mock server integration tests pass |
| Report change | Report HTML/PDF tests and report authorization tests pass |
| Database change | Prisma migration test and relationship integration tests pass |

## Manual Exploratory Checklist

Run before major demos or releases:

- Register and login as a new user.
- Create organization, project, and asset.
- Start a scan only after checking authorization confirmation.
- Confirm scan progress is understandable.
- Open findings and verify evidence is redacted and useful.
- Update finding status and verify dashboard counts remain sensible.
- Generate executive, technical, and full reports.
- Confirm downloaded PDF looks professional.
- Attempt direct URLs for another user’s resources and verify denial.
- Confirm no secret/token values appear in UI, logs, reports, or network responses.

