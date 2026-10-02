# OWASP ZAP Integration

LuminarIQ SecureScan uses OWASP ZAP for defensive website and web application scanning after the user confirms they own the asset or have explicit authorization to test it.

## Scan Modes

- **OWASP ZAP Baseline Scan**: Default MVP mode. Uses ZAP in a passive baseline workflow and imports alerts into SecureScan findings.
- **OWASP ZAP Full Scan**: Performs deeper crawl and active scan steps. It requires an additional confirmation because it can generate more traffic and trigger security controls or logs.

## Safety Rules

Every ZAP scan requires:

- Authenticated user.
- User access to the asset organization.
- Authorization confirmation.
- Valid `http` or `https` URL.
- SaaS target safety checks.
- Organization scan limits.
- ZAP concurrency limit.
- Scan timeout and polling controls.

SecureScan blocks localhost, private networks, link-local networks, cloud metadata targets, and hostnames that resolve to private/internal IPs. Blocked targets return:

```json
{
  "message": "This target is not allowed for SaaS-hosted scanning."
}
```

## Environment Variables

```env
ZAP_ENABLED=true
ZAP_API_URL=http://localhost:8080
ZAP_API_KEY=change-this-zap-key
ZAP_DEFAULT_SCAN_MODE=baseline
ZAP_BASELINE_TIMEOUT_SECONDS=300
ZAP_FULL_SCAN_TIMEOUT_SECONDS=1800
ZAP_MAX_CONCURRENT_SCANS=1
ZAP_POLL_INTERVAL_MS=5000
```

Set `ZAP_ENABLED=false` to disable OWASP ZAP scanning without removing the UI or internal scanner.

## Run ZAP Locally

With Docker:

```bash
docker run -u zap -p 8080:8080 -d ghcr.io/zaproxy/zaproxy:stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.disablekey=false -config api.key=change-this-zap-key
```

The local `docker-compose.yml` also includes a `zap` service. Use the same `ZAP_API_KEY` in the API and ZAP container.

## Start Backend

For this monorepo:

```bash
corepack pnpm --filter @luminar-iq/api dev
```

If running a legacy backend folder:

```bash
cd backend
npm run dev
```

## Start Frontend

For this monorepo:

```bash
corepack pnpm --filter @luminar-iq/web dev
```

If running a legacy frontend folder:

```bash
cd frontend
npm run dev
```

## Start a ZAP Scan From UI

1. Log in to SecureScan.
2. Open an asset detail page for a website or web application.
3. Click **Start Scan**.
4. Choose **OWASP ZAP Baseline Scan** or **OWASP ZAP Full Scan**.
5. Confirm: `I confirm that I own this asset or have explicit authorization to scan it.`
6. For full scans, also confirm the full-scan traffic warning.
7. Start the scan and monitor the progress page.

## Troubleshooting

- **ZAP unavailable**: Confirm the Docker container is running and `ZAP_API_URL` points to it.
- **Invalid API key**: Ensure `ZAP_API_KEY` matches the ZAP daemon config.
- **Unsafe target blocked**: Use a public authorized domain. SaaS-hosted scanning blocks local, private, and metadata targets.
- **Timeout**: Increase baseline or full scan timeout only for trusted authorized targets.
- **No alerts returned**: The scan may still be valid. Review job status and rerun after confirming the target is reachable.

## Reporting

Reports include scanner used, scan mode, whether ZAP findings were imported, ZAP risk/confidence, OWASP mapping, remediation, and retest steps. Automated results should be validated before production remediation.
