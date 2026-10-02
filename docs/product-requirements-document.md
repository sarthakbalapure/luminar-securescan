# LuminarIQ SecureScan Product Requirements Document

## 1. Product Overview

LuminarIQ SecureScan is an AI-powered defensive security audit SaaS platform for organizations that need fast, understandable security posture visibility across websites, web applications, APIs, and source code repositories.

The platform allows authorized users to register assets, run safe baseline scans, review prioritized findings, understand business and technical impact, receive developer-ready remediation guidance, and generate professional executive and technical reports.

## 2. Problem Statement

Small and mid-sized software teams often lack continuous, affordable, and understandable security assessment workflows. Traditional penetration tests can be expensive and periodic, while raw scanner tools often produce noisy results without business context, prioritization, or practical remediation steps.

LuminarIQ SecureScan solves this by combining safe automated scanning, normalized findings, severity scoring, OWASP mapping, remediation guidance, and report generation in a SaaS workspace built for teams.

## 3. Target Users

- Startup founders and CTOs
- Security engineers
- DevOps and platform engineers
- Backend and frontend developers
- Compliance and risk teams
- Agencies managing client security reviews
- Product teams preparing for customer security reviews

## 4. Business Goals

- Provide a self-service security audit platform for SaaS teams.
- Reduce time from asset registration to actionable findings.
- Make security findings understandable for both technical and non-technical stakeholders.
- Create professional reports suitable for executives, engineers, and customer assurance.
- Establish a foundation for subscription-based security monitoring.
- Build trust through safe, authorization-bound scanning.

## 5. Product Vision

LuminarIQ SecureScan should become a defensive security copilot for modern software teams: continuously monitoring common security weaknesses, explaining risk clearly, guiding remediation, and producing audit-ready evidence without requiring deep security expertise.

Long term, the platform should support recurring scans, deeper authenticated checks, cloud posture reviews, repository security analysis, compliance workflows, and controlled AI-assisted remediation.

## 6. MVP Scope

The MVP includes:

- User registration and login.
- JWT-based authentication.
- Organization workspace management.
- Project management.
- Asset management for websites, APIs, and repositories.
- Authorization confirmation before scans.
- Website baseline scanning.
- API baseline scanning using OpenAPI specifications.
- Repository scanning using safe command wrappers and redacted evidence.
- Optional passive OWASP ZAP baseline scan.
- Scanner worker using Redis/BullMQ.
- Findings normalization.
- Severity scoring and security score calculation.
- OWASP mapping.
- AI-style deterministic remediation templates.
- Dashboard with security posture summary.
- Finding detail pages.
- Status management for findings.
- Executive, technical, and full report generation.
- PDF report download.
- Audit logging for key user and workspace actions.

## 7. Out-of-Scope Items

The following are out of scope for the MVP:

- Aggressive active exploitation scans.
- Destructive payload testing.
- Credential stuffing or brute force testing.
- Full penetration testing automation.
- Scanning third-party assets without explicit authorization.
- Full cloud security posture management.
- SAST rule authoring UI.
- Real-time WebSocket scan progress beyond placeholder/polling support.
- Enterprise SSO/SAML.
- Multi-region deployment.
- Billing provider integration.
- Advanced RBAC policy editor.
- External AI provider production integration.
- Automated pull request remediation.

## 8. User Personas

### Founder / CTO

Needs a quick view of security posture and reports for customers or investors. Values simple summaries, risk ratings, and action plans.

### Security Engineer

Needs evidence, severity rationale, OWASP mapping, deduplication, retest workflows, and exportable reports.

### Developer

Needs clear remediation instructions, code/config examples, and retest steps without reading raw scanner output.

### Compliance Manager

Needs audit logs, report history, defensive scan disclaimers, and traceable evidence.

### Agency Operator

Needs to manage multiple organizations, projects, and client assets in a repeatable workflow.

## 9. User Journeys

### Journey 1: New User Onboarding

1. User registers.
2. Personal workspace is created.
3. User logs in.
4. User lands on dashboard.
5. User creates organization/project if needed.
6. User adds first asset.

### Journey 2: Website Security Scan

1. User opens asset detail page.
2. User clicks Start Scan.
3. User confirms ownership or explicit authorization.
4. Platform creates scan and scan jobs.
5. Worker processes baseline checks.
6. Findings are normalized and stored.
7. User views scan detail and findings.
8. User opens finding detail and reviews remediation.
9. User generates report.

### Journey 3: API Baseline Scan

1. User creates API asset.
2. User uploads or links OpenAPI specification.
3. Platform parses endpoints.
4. User selects safe scan scope.
5. User confirms authorization.
6. API baseline scan runs using safe methods only.
7. API-specific findings appear in scan results and reports.

### Journey 4: Repository Scan

1. User creates repository asset.
2. User starts repository scan with branch, ZIP upload, or optional GitHub token.
3. Platform queues encrypted token payload if token is provided.
4. Worker scans isolated temporary workspace.
5. Secrets are redacted.
6. Temporary files are deleted.
7. Repository findings appear in findings and reports.

### Journey 5: Remediation And Retest

1. User reviews finding.
2. User applies recommended fix.
3. User marks finding as fixed or retest required.
4. User runs a new scan.
5. Platform marks old findings fixed if no longer detected.

## 10. Functional Requirements

### Authentication

- Users can register with name, email, and password.
- Users can log in with email and password.
- Passwords must be hashed.
- Users can fetch their profile with `/auth/me`.
- Password hashes must never be returned.

### Workspace Management

- Users can create organizations.
- Users can list organizations they belong to.
- Users can view organization details only when they are members.
- Organizations can contain multiple projects.

### Project Management

- Users can create projects within accessible organizations.
- Users can list accessible projects.
- Users can view project detail and associated assets.

### Asset Management

- Users can create website, web app, API, repository, and cloud asset records.
- API assets can store OpenAPI specification content or URL metadata.
- Repository assets can use GitHub repository URLs or ZIP uploads during scans.
- Users can only access assets in organizations where they are members.

### Scan Management

- Users can create scans only after confirming authorization.
- Scan creation must create a parent Scan record and related ScanJob records.
- Scans must support queued, running, completed, failed, and cancelled statuses.
- Worker must process jobs asynchronously.
- Failed checks must not crash the entire scan.

### Findings

- Scanner observations must be normalized into consistent findings.
- Findings must include evidence, impact, remediation, severity, and OWASP mapping.
- Duplicate findings should be avoided.
- Finding status updates must be supported.

### Reports

- Users can generate executive, technical, and full reports.
- Reports must include branding, metadata, findings, evidence, recommendations, and disclaimers.
- Users can download PDF reports.

## 11. Non-Functional Requirements

- The UI must be responsive for desktop and tablet.
- API responses should be predictable and validated.
- Scanner modules must be defensive and non-invasive.
- System should support asynchronous scan workloads.
- Reports should be professional and readable.
- Tests should cover core user flows and security boundaries.
- Logs should be structured for worker operations.

## 12. Security Requirements

- JWT secret must come from environment configuration.
- Passwords must be hashed using bcrypt or equivalent.
- Password hashes must never be exposed.
- Organization membership authorization must be enforced.
- Users must not access another organization's data.
- Scan authorization confirmation is mandatory.
- Localhost, metadata IPs, and private IP ranges must be blocked by default in SaaS-hosted scans.
- Repository tokens must not be stored in plaintext.
- Sensitive evidence must be redacted.
- Scanner modules must not perform destructive actions.
- Auth routes should support rate limiting.
- CORS and Helmet security middleware should be configured.

## 13. Compliance and Standards Mapping

Findings should map where relevant to:

- OWASP Top 10
- CWE identifiers where applicable
- OWASP API Security Top 10 for API checks
- Browser security best practices
- TLS certificate hygiene
- Secure software supply chain practices

Initial OWASP categories include:

- Broken Access Control
- Cryptographic Failures
- Injection
- Insecure Design
- Security Misconfiguration
- Vulnerable and Outdated Components
- Identification and Authentication Failures
- Software and Data Integrity Failures
- Security Logging and Monitoring Failures
- Server-Side Request Forgery

## 14. System Architecture

High-level architecture:

- Next.js web frontend.
- NestJS backend API.
- PostgreSQL database using Prisma ORM.
- Redis/BullMQ queue for scan jobs.
- Scanner worker process.
- Optional OWASP ZAP service for passive baseline scanning.
- PDF generation using Playwright/Puppeteer-compatible rendering.

Primary data flow:

1. User authenticates in web app.
2. API validates JWT and membership.
3. User creates asset and starts scan.
4. API creates Scan and ScanJob records.
5. API enqueues job in Redis/BullMQ.
6. Worker processes scan jobs.
7. Worker stores findings, evidence, recommendations, score.
8. Frontend displays dashboard, scan detail, findings, and reports.

## 15. Key Modules

- Authentication module
- Organizations module
- Projects module
- Assets module
- Scans module
- Scanner worker
- Findings module
- Finding normalization engine
- Severity scoring engine
- Recommendation engine
- Reports module
- Dashboard UI
- Audit logging module
- Admin module placeholder
- Subscription plan module placeholder

## 16. Data Model Overview

Core entities:

- User
- Organization
- OrganizationMember
- Project
- Asset
- ApiSpecification
- Scan
- ScanJob
- Finding
- FindingEvidence
- Recommendation
- Report
- AuditLog
- SubscriptionPlan

Key relationships:

- A user can belong to many organizations.
- An organization can have many members and projects.
- A project can have many assets.
- An asset can have many scans and findings.
- A scan can have many scan jobs, findings, and reports.
- A finding can have evidence and recommendations.
- Audit logs belong to organizations and users.

## 17. Scan Workflow

1. User selects an asset.
2. User clicks Start Scan.
3. Platform displays authorization confirmation text:
   `I confirm that I own this asset or have explicit authorization to scan it.`
4. User confirms authorization.
5. API validates asset ownership and scan type compatibility.
6. API creates scan with status `QUEUED`.
7. API creates scan jobs.
8. API pushes job to BullMQ.
9. Worker marks scan `RUNNING`.
10. Worker executes checks.
11. Worker records check failures without crashing entire scan.
12. Worker normalizes findings.
13. Worker calculates security score.
14. Worker stores findings, evidence, and recommendations.
15. Worker marks scan `COMPLETED` or `FAILED`.
16. UI polls or refreshes scan state.

## 18. Findings and Severity Model

Severity levels:

- Critical
- High
- Medium
- Low
- Info

Security score:

- Start at 100.
- Critical finding: minus 25.
- High finding: minus 12.
- Medium finding: minus 6.
- Low finding: minus 2.
- Info finding: minus 0.5.
- Minimum score is 0.

Finding statuses:

- Open
- In Progress
- Risk Accepted
- False Positive
- Fixed
- Retest Required

Each finding should include:

- Title
- Description
- Severity
- Category
- OWASP mapping
- Evidence summary
- Business impact
- Technical impact
- Remediation summary
- Status
- Detection timestamps
- Evidence records
- Recommendation records

## 19. Reporting Requirements

Report types:

- Executive Summary Report
- Technical Findings Report
- Full Security Audit Report

Executive report must include:

- LuminarIQ branding
- Organization name
- Project name
- Asset URL
- Scan date
- Security score
- Risk rating
- Severity summary
- Top risks
- Business impact summary
- Recommended action plan
- Defensive authorized scan disclaimer

Technical report must include:

- Scan metadata
- Methodology
- Scope
- Checks performed
- Detailed findings
- Evidence
- OWASP mapping
- Remediation steps
- Retest steps

Full report must include:

- Executive section
- Technical section
- Appendix
- Raw check summary
- Finding status summary
- Glossary

## 20. AI Remediation Assistant Requirements

MVP mode:

- Deterministic template-based recommendation engine.

Future mode:

- External AI provider abstraction.

Template output must include:

- Plain-English explanation
- Business impact
- Technical impact
- Recommended fix
- Code/config examples
- Retest steps
- Priority guidance

Guardrails:

- Do not invent vulnerabilities.
- Do not provide offensive exploitation instructions.
- Do not provide bypass steps.
- Do not generate harmful payloads.
- Use scanner evidence as source context.
- Prefer defensive remediation.

## 21. Admin Requirements

MVP admin requirements:

- Basic admin module placeholder.
- Ability to distinguish platform admin role from regular users.
- Support future admin-only settings for private network scanning and scan limits.

Future admin requirements:

- Organization member management.
- Subscription management.
- Usage visibility.
- Scan policy configuration.
- Audit log review.
- Scanner allowlist controls.

## 22. Subscription and Pricing Placeholder

Initial subscription model placeholder:

- Plan name
- Scan limit
- Asset limit
- Valid from date
- Valid to date
- Active status

Potential future tiers:

- Free / Trial
- Startup
- Growth
- Enterprise

Pricing dimensions:

- Number of assets
- Number of scans per month
- Report generation volume
- API/repository scanning access
- Team members
- Retention period

## 23. Audit Logging Requirements

Audit logs should be written for:

- Registration
- Login
- Organization creation
- Project creation
- Asset creation
- Scan creation
- Report generation
- Finding status changes
- Future admin actions

Audit log fields:

- Organization ID
- User ID
- Action
- Entity type
- Entity ID
- Metadata
- Created timestamp

Audit logs should not store plaintext secrets.

## 24. Error Handling Requirements

- API errors must return safe messages.
- Validation errors should be clear and actionable.
- Internal stack traces must not be exposed to users.
- Scanner failures should be captured per job.
- A failed scanner check should not necessarily fail the entire scan.
- Queue unavailability should return service-unavailable style errors.
- Report generation failures should be visible to users without crashing the UI.
- Frontend should show loading, empty, and error states.

## 25. Performance Requirements

MVP targets:

- Dashboard should load within 3 seconds with normal demo data.
- Scan creation API should respond within 1 second when queue is available.
- Worker should process baseline checks asynchronously.
- Small reports should generate within 5 seconds.
- Finding detail pages should load within 2 seconds for typical findings.

Future targets:

- Support 100+ queued scans in a test environment.
- Support 1,000+ findings in scan history/report workflows.
- Add dashboard query optimization for larger tenants.

## 26. Availability Requirements

MVP availability:

- Local development and demo deployment.
- Graceful error handling when Redis or database is unavailable.
- Worker can restart and continue processing queued jobs.

Future availability:

- Production deployment with managed PostgreSQL and Redis.
- Health checks for API, web, worker, database, Redis, and ZAP service.
- Backup and restore strategy.
- Monitoring and alerting.

## 27. Privacy Requirements

- Store only required user profile data.
- Never expose password hashes.
- Avoid storing repository tokens in plaintext.
- Redact secrets from scanner evidence.
- Redact sensitive values in reports.
- Avoid logging sensitive headers or tokens.
- Provide future data retention controls.
- Provide future organization data deletion workflow.

## 28. Safety and Authorization Boundary

LuminarIQ SecureScan is a defensive scanning platform. It must only scan assets where the user confirms ownership or explicit authorization.

Safety requirements:

- Authorization confirmation required before every scan.
- No destructive or aggressive active attacks in MVP.
- Default to passive/baseline checks.
- Do not brute force.
- Do not crawl aggressively.
- Do not download large files.
- Limit response body size.
- Use safe HTTP methods where possible.
- Block localhost, metadata IPs, and private ranges by default.
- Clearly label reports as defensive authorized scans only.

## 29. Acceptance Criteria

MVP acceptance criteria:

- User can register and log in.
- User can create organization, project, and asset.
- User can start scan only after authorization confirmation.
- Scan runs asynchronously through queue and worker.
- Scan statuses update correctly.
- Findings are generated, normalized, deduplicated, and stored.
- Security score is calculated.
- Dashboard displays posture metrics.
- User can inspect scan results.
- User can open finding detail.
- User can update finding status.
- Recommendations are generated from templates.
- User can generate and download reports.
- Unauthorized users cannot access another organization’s data.
- Audit logs are written for key actions.
- Tests cover critical service, scanner, and E2E flows.

## 30. Phase-wise Roadmap

### Phase 1: MVP Foundation

- Authentication
- Organizations/projects/assets
- Website baseline scans
- Findings normalization
- Dashboard
- Reports
- Remediation templates

### Phase 2: Expanded Scanning

- API baseline scanning
- Repository scanning
- OWASP ZAP passive baseline integration
- More scanner checks
- Better scan progress UX

### Phase 3: Team and Governance

- Member invitations
- Role management
- Audit log UI
- Subscription enforcement
- Usage dashboard

### Phase 4: Advanced Security Intelligence

- External AI provider integration
- Confidence scoring
- Trend analysis
- Recurring scans
- Notifications
- Jira/GitHub issue creation

### Phase 5: Enterprise Readiness

- SSO/SAML
- Advanced RBAC
- Compliance dashboards
- Data retention controls
- Multi-region deployment
- SLAs and monitoring

## 31. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Unauthorized scanning misuse | Legal and trust risk | Mandatory authorization confirmation, target blocking, audit logs |
| False positives | User distrust | Evidence summaries, severity rationale, status workflow |
| Secret exposure in findings/reports | High security risk | Redaction, masking, no plaintext token storage |
| Scanner crashes | Failed scans | Per-job error handling and worker resilience |
| Queue outage | Scans cannot start | Service-unavailable response and retry guidance |
| Report generation performance | Poor UX | Async generation and report size testing |
| AI hallucination | Bad remediation advice | Template-first engine and strict provider guardrails |
| Tenant data leakage | Critical security issue | Membership checks and access-control tests |

## 32. Open Questions

- What subscription limits should apply to MVP plans?
- Should scan scheduling be included before public beta?
- What retention period should apply to scans, findings, and reports?
- Should organization owners be able to delete scan history?
- Which compliance mappings beyond OWASP are required first?
- Should repository tokens be supported beyond one-time scan usage?
- What is the production policy for scanning private network assets?
- Which notification channels should be prioritized?
- Should ZAP be optional per organization or per scan?
- What SLA is expected for report generation?

## 33. Appendix

### Key Terms

- Asset: A website, web application, API, repository, or cloud resource registered for review.
- Scan: A user-authorized security assessment run against an asset.
- ScanJob: A specific check or scanner module within a scan.
- Finding: A normalized security issue or observation.
- Evidence: The scanner-observed data supporting a finding.
- Recommendation: Defensive remediation guidance for a finding.
- Security Score: A 0-100 score derived from finding severities.

### Reference Documents

- [Test Strategy](./test-strategy.md)
- [Detailed Test Cases](./detailed-test-cases.md)
- [Test Execution Report](./test-execution-report.md)
- [Acceptance Criteria](./acceptance-criteria.md)
- [Roadmap](./roadmap.md)

### MVP Scan Types

- Website baseline scan
- API baseline scan
- Repository scan

### MVP Website Checks

- HTTPS check
- Security headers check
- Cookie security check
- Exposed sensitive files check
- TLS summary check
- Optional passive OWASP ZAP baseline scan

### MVP API Checks

- OpenAPI specification checks
- Safe endpoint checks
- Authentication declaration checks
- CORS/rate-limit header observations
- Sensitive schema indicators

### MVP Repository Checks

- Hardcoded secret indicators
- Dependency audit outputs
- Static code analysis outputs
- Dockerfile/configuration posture
- Environment file exposure
- Weak crypto patterns
- CI/CD secret leakage patterns

