# Roadmap

## Phase 1: MVP Foundation

- Monorepo with Next.js, NestJS, shared contracts, scanner worker, PostgreSQL, and Redis.
- Rule-based remediation templates for initial website checks.
- Defensive scan confirmation at asset and scan boundaries.
- HTML report renderer and dashboard shell.

## Phase 2: Persistent Workflows

- Replace in-memory services with Prisma repositories.
- Add JWT guards, role-based organization membership, audit logging, and project CRUD.
- Wire BullMQ scan jobs to the scanner worker.
- Store scan findings, evidence, recommendations, and reports.

## Phase 3: Scanner Depth

- Add real HTTPS, TLS certificate, security header, cookie, and exposed file checks.
- Add domain ownership verification using DNS TXT and hosted file methods.
- Add rate limiting, scan concurrency limits, and per-plan quotas.

## Phase 4: Integrations

- Add OWASP ZAP passive scanning in a controlled Docker worker.
- Add OpenAPI scanning, GitHub repository scanning, dependency scanning, and secrets scanning.
- Add Jira and GitHub issue creation.

## Phase 5: Commercialization

- Add subscription billing, agency white-label reports, team invitations, and branded exports.
