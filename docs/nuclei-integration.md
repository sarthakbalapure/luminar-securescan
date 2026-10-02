# Nuclei Integration

LuminarIQ SecureScan uses Nuclei for fast, defensive, template-based checks against websites and web applications that the user owns or is explicitly authorized to test.

## Scan Modes

- **Nuclei Safe Baseline Scan**: Default mode. Runs lower-noise categories such as misconfiguration, exposures, technologies, SSL, and HTTP checks.
- **Nuclei CVE Scan**: Runs CVE-oriented templates with rate limits and timeout controls.
- **Nuclei Full Template Scan**: Broader template coverage. Requires an additional confirmation because it may send more requests and trigger logs or controls.

Users cannot upload templates, edit templates, or pass custom command-line flags in the MVP.

## Safety Rules

Every Nuclei scan requires:

- Authenticated user.
- User access to the asset organization.
- Authorization confirmation.
- Additional confirmation for full template scans.
- Valid `http` or `https` target.
- SaaS target safety checks.
- Organization scan limits.
- Nuclei scan concurrency limit.
- Timeout, rate limit, and concurrency controls.
- Available Nuclei binary.

SecureScan blocks localhost, private networks, link-local networks, cloud metadata targets, and hostnames that resolve to private/internal IPs. Blocked targets return:

```json
{
  "message": "This target is not allowed for SaaS-hosted scanning."
}
```

## Environment Variables

```env
NUCLEI_ENABLED=true
NUCLEI_MODE=binary
NUCLEI_BINARY_PATH=nuclei
NUCLEI_TEMPLATES_PATH=./nuclei-templates
NUCLEI_UPDATE_TEMPLATES=false
NUCLEI_DEFAULT_SCAN_MODE=safe_baseline
NUCLEI_TIMEOUT_SECONDS=600
NUCLEI_FULL_SCAN_TIMEOUT_SECONDS=1800
NUCLEI_RATE_LIMIT=5
NUCLEI_CONCURRENCY=5
NUCLEI_MAX_CONCURRENT_SCANS=1
NUCLEI_OUTPUT_DIR=./tmp/nuclei-results
```

Set `NUCLEI_ENABLED=false` to disable Nuclei scans without removing internal or OWASP ZAP scans.

## Local Setup

Install Nuclei using your preferred package manager or the official release method, then verify:

```bash
nuclei -version
```

Optional template update:

```bash
nuclei -update-templates
```

Configure `NUCLEI_TEMPLATES_PATH` if templates are stored outside the default Nuclei location.

## Start Backend

```bash
corepack pnpm --filter @luminar-iq/api dev
```

## Start Frontend

```bash
corepack pnpm --filter @luminar-iq/web dev
```

## Run a Nuclei Scan From UI

1. Log in to SecureScan.
2. Open a website or web application asset.
3. Click **Start Scan**.
4. Select **Nuclei Safe Baseline Scan**, **Nuclei CVE Scan**, or **Nuclei Full Template Scan**.
5. Confirm that you own the asset or have explicit authorization.
6. For full template scans, confirm the higher-traffic warning.
7. Start the scan and monitor progress.

## Troubleshooting

- **Nuclei unavailable**: Confirm `nuclei -version` works and `NUCLEI_BINARY_PATH` is correct.
- **Templates missing**: Install or update templates and verify `NUCLEI_TEMPLATES_PATH`.
- **Unsafe target blocked**: Use a public authorized domain. SaaS scanning blocks local, private, and metadata targets.
- **Timeout**: Increase timeout only for trusted authorized assets.
- **No findings**: The scan may still be valid; review scan jobs and rerun after confirming the asset is reachable.

## Reporting

Reports include scanner used, scan mode, whether Nuclei findings were imported, template ID, template severity, tags, OWASP mapping, remediation, and retest steps. Raw command details and potentially sensitive evidence are not shown to end users.
