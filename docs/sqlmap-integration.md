# sqlmap Integration

LuminarIQ SecureScan uses sqlmap only for controlled, authorized SQL injection detection against a specific endpoint and parameter.

## Authorized Use

Every sqlmap scan requires confirmation that the user owns the asset or has explicit authorization. SQL injection testing also requires a second confirmation because it sends test payloads to the selected endpoint.

## What This Integration Does

- Tests one selected URL and one selected parameter.
- Supports GET and POST detection workflows.
- Uses fixed backend-controlled sqlmap arguments.
- Imports a finding only when detection output indicates possible SQL injection.
- Adds defensive remediation and retest guidance.

## What This Integration Does Not Do

This integration does not dump data, list databases, extract tables or columns, read or write files, open shells, run operating system commands, use tamper scripts, crawl sites, brute-force credentials, or provide bypass workflows.

Forbidden sqlmap features include `--dump`, `--dump-all`, `--os-shell`, `--file-read`, `--file-write`, `--sql-shell`, `--passwords`, `--dbs`, `--tables`, `--columns`, `--tamper`, `--crawl`, and `--forms`.

## Environment Variables

```env
SQLMAP_ENABLED=true
SQLMAP_BINARY_PATH=sqlmap
SQLMAP_TIMEOUT_SECONDS=600
SQLMAP_MAX_CONCURRENT_SCANS=1
SQLMAP_RISK=1
SQLMAP_LEVEL=1
SQLMAP_OUTPUT_DIR=./tmp/sqlmap-results
```

Set `SQLMAP_ENABLED=false` to disable sqlmap scans.

## Install sqlmap

Install sqlmap locally using the official project instructions or your package manager, then verify:

```bash
sqlmap --version
```

## Start Backend

```bash
corepack pnpm --filter @luminar-iq/api dev
```

## Start Frontend

```bash
corepack pnpm --filter @luminar-iq/web dev
```

## Run a SQL Injection Detection Scan

1. Log in to SecureScan.
2. Open a website, web app, or API asset.
3. Click **Start Scan**.
4. Choose **SQL Injection Detection Scan**.
5. Enter a target endpoint URL belonging to the selected asset domain.
6. Select GET or POST.
7. Enter the parameter to test.
8. For POST, enter a simple encoded request body such as `query=test`.
9. Confirm asset authorization and SQL injection testing authorization.
10. Start the scan and monitor progress.

## Troubleshooting

- **sqlmap unavailable**: Verify `sqlmap --version` works and `SQLMAP_BINARY_PATH` is correct.
- **Unsafe target blocked**: Use a public authorized target. SaaS scanning blocks localhost, private networks, and cloud metadata targets.
- **Target outside asset domain**: The target endpoint hostname must match the selected asset domain or a subdomain.
- **Missing parameter**: GET URLs must include the selected parameter in the query string.
- **No SQL injection detected**: The scan may complete with no findings. Continue to use parameterized queries and safe ORM patterns.

## Safe Remediation

Use parameterized queries, prepared statements, ORM query binding, strict input validation, least-privilege database accounts, and generic user-facing errors.

```js
const result = await db.query(
  'SELECT * FROM products WHERE id = $1',
  [productId]
);
```

```js
const product = await Product.findOne({ _id: validatedProductId });
```
