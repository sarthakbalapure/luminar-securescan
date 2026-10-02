# LuminarIQ SecureScan REST API Specification

## Conventions

Base URL:

- Local API: `http://localhost:4010`
- Local web proxy: `http://localhost:3000/api/backend`
- Production: TBD

Authentication:

- Protected endpoints require `Authorization: Bearer <jwt>`.
- JWT subject is the authenticated user ID.
- Unless noted, allowed roles are `USER` and `PLATFORM_ADMIN`.
- Tenant access is always constrained by organization membership.

Common error format:

```json
{
  "statusCode": 400,
  "message": "Validation failed.",
  "error": "Bad Request"
}
```

Common error responses:

| Status | Meaning |
| --- | --- |
| 400 | Invalid request body, params, query, or business rule violation |
| 401 | Missing, invalid, or expired JWT |
| 403 | Authenticated but not allowed |
| 404 | Resource not found or not visible to user |
| 409 | Conflict, duplicate slug/name/email |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Queue, scanner, database, or report service unavailable |

Common security notes:

- Never return `passwordHash`.
- Never return plaintext API bearer tokens or repository tokens.
- Redact secret-like finding evidence.
- Validate UUID path parameters.
- Enforce tenant membership on every organization-scoped resource.
- Audit security-sensitive mutations.

## Authentication

### POST /auth/register

Purpose: Register a new user and create a default personal workspace.

Auth required: No.

Roles allowed: Public.

Request parameters: None.

Request body example:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "SecurePass!123"
}
```

Response body example:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "role": "USER"
  }
}
```

Validation rules:

- `name`: required, string, 2-120 characters.
- `email`: required, valid email, normalized to lowercase.
- `password`: required, minimum 12 characters.
- Email must be unique.

Error responses:

- 400 invalid input.
- 409 or 400 duplicate email.
- 429 too many registration attempts.

Audit log behavior:

- Write `USER_REGISTERED` with user ID and workspace organization ID.

Security notes:

- Hash password with bcrypt or equivalent.
- Do not expose password hash.
- Rate limit this endpoint.

### POST /auth/login

Purpose: Authenticate a user and issue a JWT.

Auth required: No.

Roles allowed: Public.

Request parameters: None.

Request body example:

```json
{
  "email": "demo@luminar.example",
  "password": "DemoPassword!123"
}
```

Response body example:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
    "name": "Demo Security Lead",
    "email": "demo@luminar.example",
    "role": "USER"
  }
}
```

Validation rules:

- `email`: required, valid email.
- `password`: required.
- User must be active.

Error responses:

- 400 invalid input.
- 401 invalid email or password.
- 429 too many login attempts.

Audit log behavior:

- Write `USER_LOGIN` on successful login.

Security notes:

- Use generic failure message.
- Rate limit by IP and email.
- Never return password hash.

### GET /auth/me

Purpose: Return the current authenticated user profile and workspace memberships.

Auth required: Yes.

Roles allowed: `USER`, `PLATFORM_ADMIN`.

Request parameters: None.

Request body example: None.

Response body example:

```json
{
  "id": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
  "name": "Demo Security Lead",
  "email": "demo@luminar.example",
  "role": "USER",
  "isActive": true,
  "organizationMembers": [
    {
      "role": "OWNER",
      "organization": {
        "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
        "name": "LuminarIQ Demo",
        "slug": "luminar-demo"
      }
    }
  ]
}
```

Validation rules:

- Valid JWT required.

Error responses:

- 401 missing/invalid token.
- 401 user no longer exists or is inactive.

Audit log behavior:

- No audit log required.

Security notes:

- Do not include password hash.

### POST /auth/logout

Purpose: Log out the current session.

Auth required: Yes.

Roles allowed: `USER`, `PLATFORM_ADMIN`.

Request parameters: None.

Request body example: None.

Response body example:

```json
{
  "success": true
}
```

Validation rules:

- Valid JWT required.

Error responses:

- 401 missing/invalid token.

Audit log behavior:

- Optional `USER_LOGOUT`.

Security notes:

- MVP can be client-side token deletion only.
- Future implementation should support token revocation or short-lived tokens with refresh flow.

## Organizations

### POST /organizations

Purpose: Create a new organization workspace.

Auth required: Yes.

Roles allowed: `USER`, `PLATFORM_ADMIN`.

Request parameters: None.

Request body example:

```json
{
  "name": "Northstar Security",
  "slug": "northstar-security"
}
```

Response body example:

```json
{
  "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000002",
  "name": "Northstar Security",
  "slug": "northstar-security",
  "ownerId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
  "createdAt": "2026-07-07T08:00:00.000Z",
  "updatedAt": "2026-07-07T08:00:00.000Z"
}
```

Validation rules:

- `name`: required, 2-120 characters.
- `slug`: required, lowercase URL-safe string, unique.

Error responses:

- 400 invalid input.
- 401 unauthenticated.
- 409 duplicate slug.

Audit log behavior:

- Write `ORGANIZATION_CREATED`.

Security notes:

- Creator becomes OWNER.

### GET /organizations

Purpose: List organizations visible to the authenticated user.

Auth required: Yes.

Roles allowed: `USER`, `PLATFORM_ADMIN`.

Request parameters:

- Optional `limit`, `cursor` for future pagination.

Request body example: None.

Response body example:

```json
[
  {
    "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
    "name": "LuminarIQ Demo",
    "slug": "luminar-demo",
    "ownerId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001"
  }
]
```

Validation rules:

- Valid JWT required.

Error responses:

- 401 unauthenticated.

Audit log behavior:

- No audit log required.

Security notes:

- Return only organizations where user is a member unless platform admin.

### GET /organizations/:id

Purpose: Fetch organization detail.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID organization ID.

Request body example: None.

Response body example:

```json
{
  "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
  "name": "LuminarIQ Demo",
  "slug": "luminar-demo",
  "ownerId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
  "members": [
    {
      "userId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
      "role": "OWNER"
    }
  ]
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Use membership-scoped lookup.

### PATCH /organizations/:id

Purpose: Update organization name or slug.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID organization ID.

Request body example:

```json
{
  "name": "Northstar AppSec",
  "slug": "northstar-appsec"
}
```

Response body example:

```json
{
  "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000002",
  "name": "Northstar AppSec",
  "slug": "northstar-appsec",
  "updatedAt": "2026-07-07T09:00:00.000Z"
}
```

Validation rules:

- `name`: optional, 2-120 characters.
- `slug`: optional, URL-safe, unique.
- At least one field required.

Error responses:

- 400 invalid input.
- 401 unauthenticated.
- 403 insufficient organization role.
- 404 not found.
- 409 duplicate slug.

Audit log behavior:

- Write `ORGANIZATION_UPDATED`.

Security notes:

- Do not allow non-admin members to update organization metadata.

### DELETE /organizations/:id

Purpose: Delete or archive an organization.

Auth required: Yes.

Roles allowed: Organization `OWNER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID organization ID.

Request body example:

```json
{
  "confirmation": "DELETE northstar-appsec"
}
```

Response body example:

```json
{
  "success": true
}
```

Validation rules:

- `id`: valid UUID.
- Confirmation phrase required.

Error responses:

- 400 invalid confirmation.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.
- 409 organization has active scans or retention lock.

Audit log behavior:

- Write `ORGANIZATION_DELETED` or `ORGANIZATION_ARCHIVED`.

Security notes:

- Prefer soft delete/archive for auditability.
- Consider retention policy before permanent delete.

## Projects

### POST /projects

Purpose: Create a project in an organization.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters: None.

Request body example:

```json
{
  "organizationId": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
  "name": "Customer Portal",
  "description": "Customer-facing SaaS application."
}
```

Response body example:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "organizationId": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
  "name": "Customer Portal",
  "description": "Customer-facing SaaS application.",
  "createdAt": "2026-07-07T08:05:00.000Z",
  "updatedAt": "2026-07-07T08:05:00.000Z"
}
```

Validation rules:

- `organizationId`: valid UUID and accessible.
- `name`: required, 2-120 characters.
- `description`: optional, max 1000 characters.

Error responses:

- 400 invalid input.
- 401 unauthenticated.
- 403 insufficient role.
- 404 organization not found.

Audit log behavior:

- Write `PROJECT_CREATED`.

Security notes:

- Verify organization membership before create.

### GET /projects

Purpose: List projects visible to the authenticated user.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `organizationId`: UUID.

Request body example: None.

Response body example:

```json
[
  {
    "id": "11111111-1111-4111-8111-111111111111",
    "organizationId": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
    "name": "Customer Portal",
    "description": "Customer-facing SaaS application.",
    "organization": {
      "name": "LuminarIQ Demo"
    }
  }
]
```

Validation rules:

- `organizationId`: optional valid UUID.

Error responses:

- 401 unauthenticated.
- 404 organization filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Return only member-accessible projects.

### GET /projects/:id

Purpose: Fetch project detail including assets.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID project ID.

Request body example: None.

Response body example:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "name": "Customer Portal",
  "description": "Customer-facing SaaS application.",
  "organization": {
    "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
    "name": "LuminarIQ Demo"
  },
  "assets": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "type": "WEBSITE",
      "name": "Demo Website",
      "url": "https://demo.luminar.example",
      "verifiedStatus": "VERIFIED",
      "riskLevel": "MEDIUM"
    }
  ]
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Use membership-scoped lookup.

### PATCH /projects/:id

Purpose: Update project metadata.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID project ID.

Request body example:

```json
{
  "name": "Customer Portal v2",
  "description": "Updated customer-facing application."
}
```

Response body example:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "name": "Customer Portal v2",
  "description": "Updated customer-facing application.",
  "updatedAt": "2026-07-07T09:10:00.000Z"
}
```

Validation rules:

- `name`: optional, 2-120 characters.
- `description`: optional, max 1000 characters.
- At least one field required.

Error responses:

- 400 invalid input.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.

Audit log behavior:

- Write `PROJECT_UPDATED`.

Security notes:

- Verify membership through parent organization.

### DELETE /projects/:id

Purpose: Delete or archive a project.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID project ID.

Request body example:

```json
{
  "confirmation": "DELETE PROJECT"
}
```

Response body example:

```json
{
  "success": true
}
```

Validation rules:

- `id`: valid UUID.
- Confirmation required.

Error responses:

- 400 invalid confirmation.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.
- 409 active scans or retention policy conflict.

Audit log behavior:

- Write `PROJECT_DELETED` or `PROJECT_ARCHIVED`.

Security notes:

- Prefer archive if reports/audit records must be preserved.

## Assets

### POST /assets

Purpose: Create an asset under a project.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters: None.

Request body example:

```json
{
  "projectId": "11111111-1111-4111-8111-111111111111",
  "type": "WEBSITE",
  "name": "Demo Website",
  "url": "https://demo.luminar.example",
  "verifiedStatus": "UNVERIFIED",
  "riskLevel": "INFO"
}
```

API asset request example:

```json
{
  "projectId": "11111111-1111-4111-8111-111111111111",
  "type": "API",
  "name": "Demo API",
  "url": "https://api.demo.luminar.example",
  "baseApiUrl": "https://api.demo.luminar.example",
  "openApiSpecContent": "{\"openapi\":\"3.0.3\",\"info\":{\"title\":\"Demo\",\"version\":\"1.0.0\"},\"paths\":{}}",
  "verifiedStatus": "UNVERIFIED",
  "riskLevel": "INFO"
}
```

Response body example:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "projectId": "11111111-1111-4111-8111-111111111111",
  "type": "WEBSITE",
  "name": "Demo Website",
  "url": "https://demo.luminar.example",
  "verifiedStatus": "UNVERIFIED",
  "riskLevel": "INFO"
}
```

Validation rules:

- `projectId`: valid UUID and accessible.
- `type`: `WEBSITE`, `WEB_APP`, `API`, `REPOSITORY`, `CLOUD`.
- `name`: required, 2-120 characters.
- `url`: valid URL.
- `verifiedStatus`: valid enum.
- `riskLevel`: valid enum.
- API assets require `openApiSpecContent` or `openApiSpecUrl`.
- OpenAPI URLs and base URLs must pass public URL validation unless private scanning is explicitly enabled.

Error responses:

- 400 invalid input or missing API specification.
- 401 unauthenticated.
- 403 insufficient role.
- 404 project not found.

Audit log behavior:

- Write `ASSET_CREATED`.

Security notes:

- Do not fetch internal/private OpenAPI URLs by default.

### GET /assets

Purpose: List accessible assets.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `projectId`: UUID.

Request body example: None.

Response body example:

```json
[
  {
    "id": "22222222-2222-4222-8222-222222222222",
    "projectId": "11111111-1111-4111-8111-111111111111",
    "type": "WEBSITE",
    "name": "Demo Website",
    "url": "https://demo.luminar.example",
    "riskLevel": "MEDIUM",
    "_count": {
      "scans": 3,
      "findings": 4
    }
  }
]
```

Validation rules:

- `projectId`: optional valid UUID and accessible.

Error responses:

- 401 unauthenticated.
- 404 project filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Return only assets in accessible projects.

### GET /assets/:id

Purpose: Fetch asset detail.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID asset ID.

Request body example: None.

Response body example:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "name": "Demo Website",
  "url": "https://demo.luminar.example",
  "type": "WEBSITE",
  "riskLevel": "MEDIUM",
  "verifiedStatus": "VERIFIED",
  "project": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Customer Portal"
  }
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Use membership-scoped lookup.

### PATCH /assets/:id

Purpose: Update asset metadata.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID asset ID.

Request body example:

```json
{
  "name": "Production Website",
  "riskLevel": "HIGH"
}
```

Response body example:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "name": "Production Website",
  "riskLevel": "HIGH",
  "updatedAt": "2026-07-07T10:00:00.000Z"
}
```

Validation rules:

- `name`: optional, 2-120 characters.
- `url`: optional valid URL.
- `riskLevel`: optional valid enum.
- `verifiedStatus`: optional valid enum.
- At least one field required.

Error responses:

- 400 invalid input.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.

Audit log behavior:

- Write `ASSET_UPDATED`.

Security notes:

- URL changes should reset verification state.

### DELETE /assets/:id

Purpose: Delete or archive an asset.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID asset ID.

Request body example:

```json
{
  "confirmation": "DELETE ASSET"
}
```

Response body example:

```json
{
  "success": true
}
```

Validation rules:

- Confirmation required.

Error responses:

- 400 invalid confirmation.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.
- 409 active scan exists.

Audit log behavior:

- Write `ASSET_DELETED` or `ASSET_ARCHIVED`.

Security notes:

- Prefer archive where report retention is required.

### POST /assets/:id/verify

Purpose: Start or complete asset ownership verification.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID asset ID.

Request body example:

```json
{
  "method": "DNS_TXT",
  "token": "luminar-verify=abc123"
}
```

Response body example:

```json
{
  "id": "22222222-2222-4222-8222-222222222222",
  "verifiedStatus": "PENDING",
  "verificationMethod": "DNS_TXT",
  "verificationToken": "luminar-verify=abc123"
}
```

Validation rules:

- `method`: `DNS_TXT`, `HTML_FILE`, `META_TAG`, or future supported method.
- Asset must be accessible.

Error responses:

- 400 invalid method.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.

Audit log behavior:

- Write `ASSET_VERIFICATION_STARTED` or `ASSET_VERIFIED`.

Security notes:

- Verification is separate from scan authorization confirmation.

## Scans

### POST /scans

Purpose: Queue an authorized scan for an asset.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters: None.

Request body example:

```json
{
  "assetId": "22222222-2222-4222-8222-222222222222",
  "scanType": "WEBSITE_BASELINE",
  "authorizationConfirmed": true,
  "includePassiveBaselineScan": false
}
```

API scan request example:

```json
{
  "assetId": "33333333-3333-4333-8333-333333333333",
  "scanType": "API_BASELINE",
  "authorizationConfirmed": true,
  "apiBearerToken": "Bearer transient-token",
  "scanScopePaths": ["GET /users", "HEAD /health"]
}
```

Repository scan request example:

```json
{
  "assetId": "44444444-4444-4444-8444-444444444444",
  "scanType": "REPO_SCAN",
  "authorizationConfirmed": true,
  "repositoryBranch": "main",
  "repositoryToken": "ghp_transientToken"
}
```

Response body example:

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "assetId": "22222222-2222-4222-8222-222222222222",
  "scanType": "WEBSITE_BASELINE",
  "status": "QUEUED",
  "createdBy": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001"
}
```

Validation rules:

- `assetId`: valid UUID and accessible.
- `scanType`: `WEBSITE_BASELINE`, `API_BASELINE`, `REPO_SCAN`.
- `authorizationConfirmed`: must be `true`.
- API scans require API asset with stored OpenAPI spec.
- Repository scans require repository asset.
- Repository branch must match safe pattern.
- ZIP upload must be under configured limit.

Error responses:

- 400 missing authorization confirmation or incompatible scan type.
- 401 unauthenticated.
- 403 insufficient role.
- 404 asset not found.
- 503 queue unavailable.

Audit log behavior:

- Write `SCAN_CREATED`.

Security notes:

- Do not store API bearer token in scan summary.
- Encrypt repository token before queue storage.

### GET /scans

Purpose: List accessible scans.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `assetId`: UUID.
- Optional `status`.
- Optional `scanType`.

Request body example: None.

Response body example:

```json
[
  {
    "id": "55555555-5555-4555-8555-555555555555",
    "status": "COMPLETED",
    "scanType": "WEBSITE_BASELINE",
    "securityScore": 82,
    "createdAt": "2026-07-07T10:00:00.000Z",
    "asset": {
      "name": "Demo Website",
      "url": "https://demo.luminar.example"
    },
    "_count": {
      "findings": 2
    }
  }
]
```

Validation rules:

- `assetId`: optional valid UUID and accessible.

Error responses:

- 401 unauthenticated.
- 404 asset filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Scope by organization membership.

### GET /scans/:id

Purpose: Fetch scan detail, jobs, findings, and reports.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID scan ID.

Request body example: None.

Response body example:

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "scanType": "WEBSITE_BASELINE",
  "status": "COMPLETED",
  "startedAt": "2026-07-07T10:00:00.000Z",
  "completedAt": "2026-07-07T10:02:00.000Z",
  "securityScore": 82,
  "asset": {
    "id": "22222222-2222-4222-8222-222222222222",
    "name": "Demo Website",
    "url": "https://demo.luminar.example"
  },
  "jobs": [
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "jobType": "SECURITY_HEADERS_CHECK",
      "status": "COMPLETED",
      "attempts": 1
    }
  ],
  "findings": [
    {
      "id": "77777777-7777-4777-8777-777777777777",
      "title": "Content Security Policy header is missing",
      "severity": "MEDIUM",
      "status": "OPEN"
    }
  ],
  "reports": []
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Findings evidence must remain redacted.

### POST /scans/:id/cancel

Purpose: Cancel a queued or running scan.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID scan ID.

Request body example:

```json
{
  "reason": "Queued by mistake"
}
```

Response body example:

```json
{
  "id": "55555555-5555-4555-8555-555555555555",
  "status": "CANCELLED",
  "completedAt": "2026-07-07T10:03:00.000Z"
}
```

Validation rules:

- Scan must be `QUEUED` or `RUNNING`.
- `reason`: optional max 500 characters.

Error responses:

- 400 scan cannot be cancelled.
- 401 unauthenticated.
- 403 insufficient role.
- 404 not found.

Audit log behavior:

- Write `SCAN_CANCELLED`.

Security notes:

- Worker should stop or ignore cancelled scan jobs where possible.

### POST /scans/:id/retest

Purpose: Queue a new scan using the same asset and scan type as a previous scan.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID source scan ID.

Request body example:

```json
{
  "authorizationConfirmed": true
}
```

Response body example:

```json
{
  "id": "88888888-8888-4888-8888-888888888888",
  "assetId": "22222222-2222-4222-8222-222222222222",
  "scanType": "WEBSITE_BASELINE",
  "status": "QUEUED",
  "retestOfScanId": "55555555-5555-4555-8555-555555555555"
}
```

Validation rules:

- `authorizationConfirmed`: must be true.
- Source scan must be accessible.

Error responses:

- 400 authorization not confirmed.
- 401 unauthenticated.
- 403 insufficient role.
- 404 source scan not found.
- 503 queue unavailable.

Audit log behavior:

- Write `SCAN_RETEST_CREATED`.

Security notes:

- Require fresh authorization confirmation.

## Findings

### GET /findings

Purpose: List accessible findings.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `scanId`: UUID.
- Optional `assetId`: UUID.
- Optional `severity`.
- Optional `status`.

Request body example: None.

Response body example:

```json
[
  {
    "id": "77777777-7777-4777-8777-777777777777",
    "title": "Content Security Policy header is missing",
    "severity": "MEDIUM",
    "status": "OPEN",
    "category": "Security Headers",
    "evidenceSummary": "No Content-Security-Policy header was observed."
  }
]
```

Validation rules:

- Filter IDs must be valid UUIDs.
- Severity/status filters must be valid enums.

Error responses:

- 400 invalid filters.
- 401 unauthenticated.
- 404 scan or asset filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Evidence summaries must be redacted.

### GET /findings/:id

Purpose: Fetch finding detail.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID finding ID.

Request body example: None.

Response body example:

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "title": "Content Security Policy header is missing",
  "description": "The response does not define a CSP header.",
  "severity": "MEDIUM",
  "status": "OPEN",
  "category": "Security Headers",
  "owaspMapping": ["Security Misconfiguration"],
  "evidenceSummary": "No Content-Security-Policy header was observed.",
  "businessImpact": "Browser-side attacks may have larger impact.",
  "technicalImpact": "The browser has no content loading restrictions.",
  "remediationSummary": "Deploy a tested Content Security Policy.",
  "asset": {
    "id": "22222222-2222-4222-8222-222222222222",
    "name": "Demo Website",
    "url": "https://demo.luminar.example"
  },
  "scan": {
    "id": "55555555-5555-4555-8555-555555555555"
  },
  "evidence": [
    {
      "evidenceType": "RESPONSE_HEADER",
      "url": "https://demo.luminar.example",
      "observedValue": "Header absent",
      "expectedValue": "Content-Security-Policy with reviewed directives"
    }
  ],
  "recommendations": [
    {
      "recommendationType": "CONFIGURATION",
      "remediationText": "Define a least-privilege CSP.",
      "codeExample": "Content-Security-Policy: default-src 'self'; object-src 'none'",
      "retestSteps": "Request the asset root and confirm the header is present."
    }
  ]
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Do not expose raw secrets in evidence or raw JSON.

### PATCH /findings/:id/status

Purpose: Update finding workflow status.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID finding ID.

Request body example:

```json
{
  "status": "RISK_ACCEPTED"
}
```

Response body example:

```json
{
  "id": "77777777-7777-4777-8777-777777777777",
  "status": "RISK_ACCEPTED",
  "fixedAt": null
}
```

Validation rules:

- `status`: `OPEN`, `IN_PROGRESS`, `RISK_ACCEPTED`, `FALSE_POSITIVE`, `FIXED`, `RETEST_REQUIRED`.

Error responses:

- 400 invalid status.
- 401 unauthenticated.
- 403 insufficient role.
- 404 finding not found.

Audit log behavior:

- Write `FINDING_STATUS_UPDATED`.

Security notes:

- Consider requiring reason for `RISK_ACCEPTED` and `FALSE_POSITIVE` in future.

### POST /findings/:id/comments

Purpose: Add a comment to a finding.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID finding ID.

Request body example:

```json
{
  "body": "Fix deployed to staging. Retest requested."
}
```

Response body example:

```json
{
  "id": "99999999-9999-4999-8999-999999999999",
  "findingId": "77777777-7777-4777-8777-777777777777",
  "userId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
  "body": "Fix deployed to staging. Retest requested.",
  "createdAt": "2026-07-07T11:00:00.000Z"
}
```

Validation rules:

- `body`: required, 1-2000 characters.

Error responses:

- 400 invalid body.
- 401 unauthenticated.
- 404 finding not found or inaccessible.

Audit log behavior:

- Optional `FINDING_COMMENT_CREATED`.

Security notes:

- Sanitize comment display.
- Do not allow stored XSS.

## Reports

### POST /scans/:id/reports

Purpose: Generate a report for a scan.

Auth required: Yes.

Roles allowed: Organization `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID scan ID.

Request body example:

```json
{
  "reportType": "FULL"
}
```

Response body example:

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "scanId": "55555555-5555-4555-8555-555555555555",
  "reportType": "FULL",
  "generatedAt": "2026-07-07T11:30:00.000Z"
}
```

Validation rules:

- `reportType`: `EXECUTIVE`, `TECHNICAL`, `FULL`.
- Scan must be accessible.

Error responses:

- 400 invalid report type.
- 401 unauthenticated.
- 404 scan not found.
- 503 report renderer unavailable.

Audit log behavior:

- Write `REPORT_GENERATED`.

Security notes:

- Report must redact secret evidence.

### GET /reports

Purpose: List accessible reports.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `scanId`.
- Optional `reportType`.

Request body example: None.

Response body example:

```json
[
  {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "scanId": "55555555-5555-4555-8555-555555555555",
    "reportType": "FULL",
    "generatedAt": "2026-07-07T11:30:00.000Z",
    "scan": {
      "asset": {
        "name": "Demo Website",
        "url": "https://demo.luminar.example"
      }
    }
  }
]
```

Validation rules:

- Filters must be valid.

Error responses:

- 401 unauthenticated.
- 400 invalid filters.

Audit log behavior:

- No audit log required.

Security notes:

- Scope by organization membership.

### GET /reports/:id

Purpose: Fetch report metadata.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID report ID.

Request body example: None.

Response body example:

```json
{
  "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "scanId": "55555555-5555-4555-8555-555555555555",
  "reportType": "FULL",
  "fileUrl": null,
  "generatedAt": "2026-07-07T11:30:00.000Z"
}
```

Validation rules:

- `id`: valid UUID.

Error responses:

- 401 unauthenticated.
- 404 not found or inaccessible.

Audit log behavior:

- No audit log required.

Security notes:

- Do not return report snapshot if it includes sensitive internals unless intended.

### GET /reports/:id/download

Purpose: Download generated report as PDF.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- `id`: UUID report ID.

Request body example: None.

Response body example:

- Binary PDF stream.

Headers example:

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="luminar-securescan-full-demo-website.pdf"
```

Validation rules:

- Report must be accessible.

Error responses:

- 401 unauthenticated.
- 404 report not found.
- 503 PDF renderer unavailable.

Audit log behavior:

- Optional `REPORT_DOWNLOADED`.

Security notes:

- Enforce report authorization before rendering.
- PDF must not include plaintext secrets.

## Dashboard

### GET /dashboard/summary

Purpose: Return workspace security posture summary.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `organizationId`.
- Optional `projectId`.

Request body example: None.

Response body example:

```json
{
  "totalAssets": 12,
  "totalScans": 37,
  "openCriticalFindings": 1,
  "latestSecurityScore": 82,
  "severityCounts": {
    "critical": 1,
    "high": 4,
    "medium": 9,
    "low": 12,
    "info": 3
  },
  "assetsByRiskLevel": {
    "critical": 1,
    "high": 3,
    "medium": 5,
    "low": 2,
    "info": 1
  }
}
```

Validation rules:

- Filters must be valid UUIDs and accessible.

Error responses:

- 401 unauthenticated.
- 404 organization/project filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Aggregate only accessible tenant data.

### GET /dashboard/risk-trend

Purpose: Return security score and finding count trend.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `organizationId`.
- Optional `projectId`.
- Optional `days`, default 30.

Request body example: None.

Response body example:

```json
{
  "points": [
    {
      "date": "2026-07-01",
      "securityScore": 78,
      "critical": 0,
      "high": 2,
      "medium": 5,
      "low": 7,
      "info": 1
    }
  ]
}
```

Validation rules:

- `days`: integer 1-365.

Error responses:

- 400 invalid range.
- 401 unauthenticated.
- 404 filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Do not leak aggregate data across tenants.

### GET /dashboard/recent-activity

Purpose: Return recent audit and scan activity for dashboard.

Auth required: Yes.

Roles allowed: Organization members; `PLATFORM_ADMIN`.

Request parameters:

- Optional `organizationId`.
- Optional `limit`, default 20.

Request body example: None.

Response body example:

```json
{
  "items": [
    {
      "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "type": "SCAN_COMPLETED",
      "message": "Website baseline scan completed for Demo Website.",
      "createdAt": "2026-07-07T11:40:00.000Z"
    }
  ]
}
```

Validation rules:

- `limit`: integer 1-100.

Error responses:

- 400 invalid limit.
- 401 unauthenticated.
- 404 organization filter not accessible.

Audit log behavior:

- No audit log required.

Security notes:

- Activity feed must be tenant-scoped.

## Admin

### GET /admin/organizations

Purpose: Platform admin list of organizations.

Auth required: Yes.

Roles allowed: `PLATFORM_ADMIN`.

Request parameters:

- Optional `search`.
- Optional `limit`, `cursor`.

Request body example: None.

Response body example:

```json
{
  "items": [
    {
      "id": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
      "name": "LuminarIQ Demo",
      "slug": "luminar-demo",
      "assetCount": 4,
      "scanCount": 12,
      "createdAt": "2026-07-01T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Validation rules:

- `limit`: integer 1-100.

Error responses:

- 401 unauthenticated.
- 403 not platform admin.

Audit log behavior:

- Optional `ADMIN_ORGANIZATIONS_VIEWED`.

Security notes:

- Platform-admin only.

### GET /admin/scans

Purpose: Platform admin list of scans across tenants.

Auth required: Yes.

Roles allowed: `PLATFORM_ADMIN`.

Request parameters:

- Optional `status`.
- Optional `scanType`.
- Optional `organizationId`.
- Optional `limit`, `cursor`.

Request body example: None.

Response body example:

```json
{
  "items": [
    {
      "id": "55555555-5555-4555-8555-555555555555",
      "organizationName": "LuminarIQ Demo",
      "assetUrl": "https://demo.luminar.example",
      "scanType": "WEBSITE_BASELINE",
      "status": "COMPLETED",
      "createdAt": "2026-07-07T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Validation rules:

- Filters must be valid.

Error responses:

- 401 unauthenticated.
- 403 not platform admin.

Audit log behavior:

- Optional `ADMIN_SCANS_VIEWED`.

Security notes:

- Do not expose transient tokens or raw secrets.

### GET /admin/audit-logs

Purpose: Platform admin audit log search.

Auth required: Yes.

Roles allowed: `PLATFORM_ADMIN`.

Request parameters:

- Optional `organizationId`.
- Optional `userId`.
- Optional `action`.
- Optional `from`.
- Optional `to`.
- Optional `limit`, `cursor`.

Request body example: None.

Response body example:

```json
{
  "items": [
    {
      "id": "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "organizationId": "9c2f2e2d-0d7b-4a95-b6e2-640000000001",
      "userId": "7d1d1d2f-9e1b-4e8a-a674-7dc01f000001",
      "action": "SCAN_CREATED",
      "entityType": "Scan",
      "entityId": "55555555-5555-4555-8555-555555555555",
      "metadata": {
        "scanType": "WEBSITE_BASELINE"
      },
      "createdAt": "2026-07-07T10:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Validation rules:

- IDs must be valid UUIDs.
- Date filters must be ISO 8601.
- `limit`: integer 1-100.

Error responses:

- 400 invalid filter.
- 401 unauthenticated.
- 403 not platform admin.

Audit log behavior:

- Optional `ADMIN_AUDIT_LOGS_VIEWED`.

Security notes:

- Audit metadata must never include plaintext secrets.
