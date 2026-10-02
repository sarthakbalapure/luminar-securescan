# LuminarIQ SecureScan Production Hardening Checklist

## Application Security

- Helmet is enabled with HSTS, referrer policy, frame, and content-type protections.
- CORS is restricted through `WEB_ORIGIN`; use comma-separated trusted origins only.
- JWT access tokens expire through `JWT_EXPIRES_IN`; refresh-token storage is intentionally left as a future server-side/session-table implementation.
- Passwords are hashed with bcrypt at cost 12.
- DTO validation uses whitelist, transformation, and non-whitelisted-field rejection.
- Production validation and unhandled error messages are sanitized.
- Auth routes use an in-memory rate limiter; replace with Redis-backed rate limits before multi-instance production.
- CSRF risk is limited because the API uses bearer tokens, not ambient cookies. If cookie auth is added, require SameSite, Secure, HttpOnly cookies and CSRF tokens.
- Request logs redact sensitive query parameters and emit structured JSON.

## Scanner Safety

- Scanner targets are restricted to HTTP/HTTPS.
- Localhost, private networks, link-local networks, documentation ranges, multicast, and cloud metadata IPs are blocked unless `SCANNER_ALLOWED_PRIVATE_NETWORKS=true`.
- Website HTTP requests perform DNS resolution checks before each request and redirect to reduce DNS rebinding risk.
- Request timeout, redirect limit, response body limit, and user-agent identification are enforced in the reusable scanner HTTP client.
- Worker concurrency is controlled by `SCAN_WORKER_CONCURRENCY`.
- Per-organization scan throttling is controlled by `SCAN_RATE_LIMIT_MAX_PER_ORG`, `SCAN_RATE_LIMIT_WINDOW_MINUTES`, and `SCAN_CONCURRENCY_MAX_PER_ORG`.
- API scanning uses safe methods only by default.
- ZAP is used in passive/baseline mode for MVP.

## Data Security

- Repository tokens and API bearer tokens are encrypted before entering the queue.
- Secret-like evidence is redacted in scanner output where supported.
- Report access is scoped through organization membership.
- Password hashes are never selected in normal user/admin response paths.
- Admin actions and scan lifecycle actions are audit logged.
- Configure `DATA_RETENTION_DAYS` and implement scheduled deletion/export workflows before storing customer data long term.

## Infrastructure

- Use `docker-compose.prod.yml` as a deployment baseline with reverse proxy, TLS, restart policies, health checks, Redis persistence, and log rotation.
- Do not expose PostgreSQL, Redis, or ZAP publicly.
- Terminate TLS at Nginx or a managed load balancer.
- Store secrets in a secret manager, not committed `.env` files.
- Run regular PostgreSQL backups and test restore procedures.
- Configure host-level firewall rules so worker egress cannot reach internal infrastructure unless explicitly approved.

## Observability

- API and worker logs are structured JSON for ingestion by a log platform.
- `ERROR_TRACKING_DSN` is reserved for Sentry or a similar provider.
- `METRICS_ENABLED` is reserved for Prometheus/OpenTelemetry instrumentation.
- Admin system health surfaces database and queue state.
- Add alerting for failed scan spikes, queue depth, report generation failures, and repeated auth throttling.

## Remaining Security Risks

- Auth rate limiting is in-memory and should move to Redis for horizontal scaling.
- JWT refresh-token rotation is a placeholder, not yet implemented.
- Data retention jobs are configuration-only placeholders.
- Worker network isolation depends on deployment/firewall policy.
- ZAP container API must remain private to the Docker network in production.
- PDF generation should run in a constrained container profile for high-risk multi-tenant environments.

## Recommended Next Steps

1. Add Redis-backed global throttling for auth, report generation, and scan creation.
2. Implement refresh-token rotation with hashed refresh tokens and revocation.
3. Add OpenTelemetry traces and Prometheus metrics for API, worker, queue, and scans.
4. Add scheduled retention cleanup and customer data export workflows.
5. Add container image scanning and SBOM generation to CI.
6. Run an external penetration test before onboarding production customers.
