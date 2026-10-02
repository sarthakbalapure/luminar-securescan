# LuminarIQ SecureScan MVP Acceptance Criteria

## Safety

- Every asset registration requires explicit confirmation that the user owns or is authorized to test the asset.
- Every scan request requires explicit authorization confirmation.
- Scanner workers block localhost and private network targets by default.
- The product copy and implementation describe defensive testing only.
- No workflow provides exploitation steps, credential theft guidance, bypass instructions, or weaponized code.

## Core Product

- Users can register and authenticate with JWT-based sessions.
- Organizations, projects, assets, scans, findings, evidence, recommendations, reports, audit logs, and subscription plans are represented in the database model.
- Website assets support HTTPS, TLS, security header, cookie, exposed file, OWASP ZAP, Nuclei, and authorized SQL injection detection scans.
- Findings include severity, status, evidence, business impact, technical explanation, OWASP mapping, remediation, and retest guidance.
- Reports can be rendered to HTML initially, with PDF export planned behind the same report service boundary.
- Dashboard UI shows posture score, open findings, scan history, retest workflow, and report actions.

## Engineering

- Environment variables are documented in `.env.example`.
- Local PostgreSQL and Redis dependencies run through Docker Compose.
- Shared TypeScript contracts validate asset registration and scan requests.
- Unit tests cover authorization validation, scan queue preconditions, and scanner analyzer behavior.
- The README documents setup, architecture, secure coding boundaries, and phase roadmap.
