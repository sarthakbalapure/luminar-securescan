# LuminarIQ SecureScan Detailed Test Cases

Status values: Not Run, Pass, Fail, Blocked. Actual Result should be completed during execution.

## Authentication Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-001 | Authentication | Register valid user | API and DB running | 1. POST `/auth/register`. 2. Query user record. | name `Asha Rao`, email `asha.auth001@luminar.example`, password `SecurePass!123` | User is created, password is hashed, access token returned, no passwordHash in response. | TBD | Not Run | P0 | Yes |
| AUTH-002 | Authentication | Reject duplicate email registration | Existing user with same email | 1. Register email once. 2. Register same email again. | `duplicate@luminar.example` | Second request returns validation/conflict error and does not create another user. | TBD | Not Run | P0 | Yes |
| AUTH-003 | Authentication | Reject invalid email | API running | 1. POST `/auth/register` with malformed email. | email `bad-email` | Request returns 400 and validation message. | TBD | Not Run | P0 | Yes |
| AUTH-004 | Authentication | Reject weak password | API running | 1. POST `/auth/register` with short password. | password `12345` | Request returns 400 and user is not created. | TBD | Not Run | P0 | Yes |
| AUTH-005 | Authentication | Login valid user | Seeded demo user exists | 1. POST `/auth/login`. | email `demo@luminar.example`, password `DemoPassword!123` | Access token and user profile returned; passwordHash omitted. | TBD | Not Run | P0 | Yes |
| AUTH-006 | Authentication | Reject wrong password | Seeded demo user exists | 1. POST `/auth/login` with wrong password. | password `WrongPass!123` | Request returns 401 and no token. | TBD | Not Run | P0 | Yes |
| AUTH-007 | Authentication | Reject unknown email login | API running | 1. POST `/auth/login` with unknown email. | `missing@luminar.example` | Request returns 401 without revealing whether account exists. | TBD | Not Run | P0 | Yes |
| AUTH-008 | Authentication | Fetch current user | Valid JWT available | 1. GET `/auth/me` with bearer token. | Token from AUTH-005 | Current user returned without passwordHash. | TBD | Not Run | P0 | Yes |
| AUTH-009 | Authentication | Reject `/auth/me` without token | API running | 1. GET `/auth/me` without Authorization header. | None | Request returns 401. | TBD | Not Run | P0 | Yes |
| AUTH-010 | Authentication | Reject malformed JWT | API running | 1. GET `/auth/me` with invalid bearer token. | `Bearer not.a.jwt` | Request returns 401. | TBD | Not Run | P0 | Yes |
| AUTH-011 | Authentication | Reject token signed with wrong secret | API running | 1. Generate token with wrong secret. 2. GET `/auth/me`. | User id from seeded data | Request returns 401. | TBD | Not Run | P0 | Yes |
| AUTH-012 | Authentication | Inactive user cannot authenticate | User `isActive=false` exists | 1. POST `/auth/login`. | inactive user credentials | Login rejected with 401/403. | TBD | Not Run | P1 | Yes |
| AUTH-013 | Authentication | Logout clears frontend token | Web app running and user logged in | 1. Click Sign out. 2. Reload dashboard. | Demo user | Token removed from local storage and user redirected to login. | TBD | Not Run | P1 | Yes |
| AUTH-014 | Authentication | Login page shows loading state | API delayed/mocked | 1. Submit login form. 2. Observe button. | Demo credentials | Submit button disables or shows loading until response. | TBD | Not Run | P2 | Yes |
| AUTH-015 | Authentication | Auth error message is user-safe | API running | 1. Login with bad credentials. | bad password | UI shows generic invalid credentials, no stack trace or DB detail. | TBD | Not Run | P0 | Yes |

## Organization, Project, And Asset Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OPA-001 | Organization management | Create organization | Authenticated user | 1. POST `/organizations`. 2. GET `/organizations`. | name `Northstar Security`, slug `northstar-security` | Organization created with user as OWNER member. | TBD | Not Run | P0 | Yes |
| OPA-002 | Organization management | Reject duplicate organization slug | Organization slug exists | 1. POST `/organizations` with existing slug. | slug `luminar-demo` | Request fails and duplicate organization is not created. | TBD | Not Run | P0 | Yes |
| OPA-003 | Organization management | List only joined organizations | Two users and two orgs exist | 1. Login as User A. 2. GET `/organizations`. | User A member of Org A only | Response includes Org A and excludes Org B. | TBD | Not Run | P0 | Yes |
| OPA-004 | Organization management | Get organization by id | Authenticated org member | 1. GET `/organizations/:id`. | Demo organization id | Organization returned with expected metadata. | TBD | Not Run | P0 | Yes |
| OPA-005 | Organization management | Reject organization access for non-member | User A and Org B exist | 1. Login as User A. 2. GET Org B. | Org B id | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| OPA-006 | Project management | Create project in organization | Authenticated org member | 1. POST `/projects`. 2. GET `/projects`. | org id, name `Customer Portal` | Project is created and listed. | TBD | Not Run | P0 | Yes |
| OPA-007 | Project management | Reject project creation in foreign organization | User A not member of Org B | 1. POST `/projects` for Org B. | Org B id | Request returns 404/403 and no project created. | TBD | Not Run | P0 | Yes |
| OPA-008 | Project management | List only accessible projects | User belongs to one org | 1. GET `/projects`. | User A token | Only projects in user's organizations are returned. | TBD | Not Run | P0 | Yes |
| OPA-009 | Project management | Get project details | Project exists | 1. GET `/projects/:id`. | Demo project id | Project with organization/assets summary returned. | TBD | Not Run | P0 | Yes |
| OPA-010 | Project management | Reject blank project name | Authenticated org member | 1. POST `/projects` with blank name. | name ` ` | Request returns 400 validation error. | TBD | Not Run | P1 | Yes |
| OPA-011 | Asset management | Create website asset | Project exists | 1. POST `/assets`. 2. GET asset. | type WEBSITE, url `https://demo.luminar.example` | Asset created with project relationship. | TBD | Not Run | P0 | Yes |
| OPA-012 | Asset management | Create API asset with OpenAPI content | Project exists | 1. POST `/assets` API with spec. | baseUrl `https://api.demo.local`, OpenAPI JSON | Asset and apiSpecification are stored. | TBD | Not Run | P0 | Yes |
| OPA-013 | Asset management | Create repository asset | Project exists | 1. POST `/assets`. | type REPOSITORY, url `https://github.com/luminar/demo-app` | Repository asset created. | TBD | Not Run | P1 | Yes |
| OPA-014 | Asset management | Reject invalid asset URL | Project exists | 1. POST `/assets` with invalid URL. | url `not-url` | Request returns 400 and no asset created. | TBD | Not Run | P0 | Yes |
| OPA-015 | Asset management | Reject asset creation in foreign project | User A not member of project org | 1. POST `/assets` for foreign project. | Foreign project id | Request returns 404/403. | TBD | Not Run | P0 | Yes |

## Scanner Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCAN-001 | Website security checks | HTTPS enabled | Mock HTTPS server running | 1. Run HTTPS check. | `https://secure.local.test` | No no-HTTPS finding is generated. | TBD | Not Run | P0 | Yes |
| SCAN-002 | Website security checks | HTTP only | Mock HTTP server running | 1. Run HTTPS check. | `http://insecure.local.test` | High severity no-HTTPS finding with remediation. | TBD | Not Run | P0 | Yes |
| SCAN-003 | Website security checks | HTTP redirects to HTTPS | Mock redirect server running | 1. Run HTTPS check. | `http://redirect.local.test` | Redirect evidence captured and no false HTTP-only result if HTTPS target works. | TBD | Not Run | P0 | Yes |
| SCAN-004 | Website security checks | Missing HSTS | HTTPS mock lacks HSTS | 1. Run headers check. | no `Strict-Transport-Security` | Medium severity HSTS finding. | TBD | Not Run | P0 | Yes |
| SCAN-005 | Website security checks | Missing CSP | Mock response lacks CSP | 1. Run headers check. | no `Content-Security-Policy` | Medium severity CSP finding. | TBD | Not Run | P0 | Yes |
| SCAN-006 | Website security checks | Missing X-Content-Type-Options | Mock response lacks header | 1. Run headers check. | no `X-Content-Type-Options` | Low/Medium finding based on policy. | TBD | Not Run | P1 | Yes |
| SCAN-007 | Website security checks | Missing frame protection | Mock lacks XFO and CSP frame-ancestors | 1. Run headers check. | no `X-Frame-Options`, no `frame-ancestors` | Clickjacking/frame protection finding generated. | TBD | Not Run | P1 | Yes |
| SCAN-008 | Website security checks | Missing Referrer-Policy | Mock response lacks header | 1. Run headers check. | no `Referrer-Policy` | Low severity finding. | TBD | Not Run | P1 | Yes |
| SCAN-009 | Website security checks | Secure headers present | Mock response has all required headers | 1. Run headers check. | full secure header set | No missing-header findings. | TBD | Not Run | P0 | Yes |
| SCAN-010 | Website security checks | Cookie missing Secure | HTTPS mock sets insecure cookie | 1. Run cookie check. | `session=abc; HttpOnly; SameSite=Lax` | High severity missing Secure finding. | TBD | Not Run | P0 | Yes |
| SCAN-011 | Website security checks | Cookie missing HttpOnly | Mock sets cookie without HttpOnly | 1. Run cookie check. | `session=abc; Secure; SameSite=Lax` | Medium severity missing HttpOnly finding. | TBD | Not Run | P0 | Yes |
| SCAN-012 | Website security checks | Cookie missing SameSite | Mock sets cookie without SameSite | 1. Run cookie check. | `session=abc; Secure; HttpOnly` | SameSite finding generated. | TBD | Not Run | P1 | Yes |
| SCAN-013 | Website security checks | Sensitive cookie name missing flags | Mock sets `auth_token` weak cookie | 1. Run cookie check. | `auth_token=abc` | Elevated severity finding and redacted evidence. | TBD | Not Run | P0 | Yes |
| SCAN-014 | Website security checks | Proper cookie flags | Mock sets hardened cookie | 1. Run cookie check. | `session=abc; Secure; HttpOnly; SameSite=Lax` | No cookie-security finding. | TBD | Not Run | P0 | Yes |
| SCAN-015 | Website security checks | Exposed `.env` | Mock route `/.env` returns 200 small body | 1. Run exposed files check. | fake env body | Critical finding generated, values redacted. | TBD | Not Run | P0 | Yes |
| SCAN-016 | Website security checks | Exposed `.git/config` | Mock route returns git config | 1. Run exposed files check. | `/.git/config` | Critical finding generated. | TBD | Not Run | P0 | Yes |
| SCAN-017 | Website security checks | Exposed backup file | Mock `backup.zip` returns accessible | 1. Run exposed files check. | `/backup.zip` | High/Critical finding, file is not fully downloaded. | TBD | Not Run | P1 | Yes |
| SCAN-018 | Website security checks | robots.txt present with sensitive paths | Mock robots lists `/admin` | 1. Run exposed files check. | `/robots.txt` with sensitive paths | Informational/low finding with safe guidance. | TBD | Not Run | P2 | Yes |
| SCAN-019 | Website security checks | sitemap.xml present | Mock sitemap accessible | 1. Run exposed files check. | `/sitemap.xml` | No high severity finding; informational if policy requires. | TBD | Not Run | P2 | Yes |
| SCAN-020 | Website security checks | TLS certificate valid | TLS adapter mock valid cert | 1. Run TLS summary check. | valid certificate metadata | No expired/self-signed finding; summary evidence stored. | TBD | Not Run | P0 | Yes |
| SCAN-021 | Website security checks | Expired TLS certificate mock | TLS adapter returns expired cert | 1. Run TLS summary check. | expiry yesterday | High severity expired certificate finding. | TBD | Not Run | P0 | Yes |
| SCAN-022 | Website security checks | TLS certificate expiring soon | TLS adapter returns expiry in 10 days | 1. Run TLS summary check. | daysUntilExpiry 10 | Warning finding with expiry date and remediation. | TBD | Not Run | P1 | Yes |
| SCAN-023 | Website security checks | Hostname mismatch certificate | TLS adapter returns mismatch | 1. Run TLS summary check. | CN not matching host | High/Medium finding based on policy. | TBD | Not Run | P0 | Yes |
| SCAN-024 | Website security checks | Timeout handling | Mock server delays beyond timeout | 1. Run scanner module. | delayed response | Check fails gracefully; scan worker continues. | TBD | Not Run | P0 | Yes |
| SCAN-025 | Website security checks | Redirect loop handling | Mock server redirects to itself | 1. Run HTTP client/check. | loop route | Error captured, no crash or infinite loop. | TBD | Not Run | P0 | Yes |
| SCAN-026 | Website security checks | Large response handling | Mock route streams large body | 1. Run exposed files check. | body > max size | Response body is limited/truncated; no memory spike. | TBD | Not Run | P0 | Yes |
| SCAN-027 | Website security checks | Connection refused | Target port closed | 1. Run baseline checks. | `https://localhost:65530` in allowed local test mode | Finding/error is user-safe; worker does not crash. | TBD | Not Run | P1 | Yes |
| SCAN-028 | Website security checks | Duplicate header observations | Mock response triggers same finding twice | 1. Run checks. | repeated missing header evidence | Duplicate finding is removed. | TBD | Not Run | P0 | Yes |
| SCAN-029 | Website security checks | ZAP baseline alert import | Mock ZAP API returns alerts | 1. Run ZAP scanner. | High, Medium, Low, Informational alerts | Alerts normalized with correct severity mapping and evidence. | TBD | Not Run | P1 | Yes |
| SCAN-030 | Website security checks | ZAP timeout enforced | Mock ZAP never completes | 1. Run ZAP scanner. | timeout config 1s | Job fails gracefully and scan continues. | TBD | Not Run | P1 | Yes |
| SCAN-031 | Scan authorization | Reject scan without confirmation | Asset exists | 1. POST `/scans` with `authorizationConfirmed=false`. | website asset id | Request returns 400 and no scan is queued. | TBD | Not Run | P0 | Yes |
| SCAN-032 | Scan authorization | Queue scan with confirmation | Verified website asset exists | 1. POST `/scans` with confirmation true. | WEBSITE_BASELINE | Scan and scan jobs created with `QUEUED` status. | TBD | Not Run | P0 | Yes |
| SCAN-033 | Scan orchestration | Optional ZAP job added | Website asset exists | 1. POST `/scans` with passive baseline option. | includePassiveBaselineScan true | `ZAP_BASELINE_SCAN` job is created. | TBD | Not Run | P1 | Yes |
| SCAN-034 | Scan orchestration | API baseline requires API asset | Website asset exists | 1. POST API_BASELINE scan for website asset. | wrong scan type | Request returns 400. | TBD | Not Run | P0 | Yes |
| SCAN-035 | Scan orchestration | Repository scan requires repository asset | Website asset exists | 1. POST REPO_SCAN for website asset. | wrong asset type | Request returns 400. | TBD | Not Run | P0 | Yes |

## Findings And Severity Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FIND-001 | Findings engine | Normalize raw missing CSP observation | Raw observation fixture exists | 1. Call normalization service. | scanner `headers`, missing CSP | Finding has title, category, severity, OWASP mapping, evidence, remediation. | TBD | Not Run | P0 | Yes |
| FIND-002 | Findings engine | Default status is OPEN | Raw finding exists | 1. Persist normalized finding. | any finding | Stored finding status is `OPEN`. | TBD | Not Run | P0 | Yes |
| FIND-003 | Findings engine | Deduplicate same finding | Same raw observation emitted twice | 1. Normalize and persist. | same title/url/evidence | Only one finding is stored. | TBD | Not Run | P0 | Yes |
| FIND-004 | Findings engine | Preserve evidence URL | Raw observation has affected URL | 1. Normalize finding. | URL `/login` | Evidence includes affected URL. | TBD | Not Run | P0 | Yes |
| FIND-005 | Findings engine | Store recommendation with finding | Template available | 1. Persist finding. | missing HSTS | Recommendation row is created. | TBD | Not Run | P1 | Yes |
| FIND-006 | Findings engine | Redact secret evidence | Raw evidence contains token | 1. Normalize repository finding. | `API_KEY=abcd1234567890secretvaluewxyz` | Full secret is not visible in evidence or rawJson. | TBD | Not Run | P0 | Yes |
| FIND-007 | Severity scoring | Score with no findings | Empty finding list | 1. Calculate score. | [] | Score is 100 and all counts zero. | TBD | Not Run | P0 | Yes |
| FIND-008 | Severity scoring | Critical penalty | One critical finding | 1. Calculate score. | severity CRITICAL | Score is 75. | TBD | Not Run | P0 | Yes |
| FIND-009 | Severity scoring | High penalty | One high finding | 1. Calculate score. | severity HIGH | Score is 88. | TBD | Not Run | P0 | Yes |
| FIND-010 | Severity scoring | Medium penalty | One medium finding | 1. Calculate score. | severity MEDIUM | Score is 94. | TBD | Not Run | P0 | Yes |
| FIND-011 | Severity scoring | Low penalty | One low finding | 1. Calculate score. | severity LOW | Score is 98. | TBD | Not Run | P0 | Yes |
| FIND-012 | Severity scoring | Info penalty | One info finding | 1. Calculate score. | severity INFO | Score is 99.5 or configured rounded equivalent. | TBD | Not Run | P1 | Yes |
| FIND-013 | Severity scoring | Score minimum zero | Many critical findings | 1. Calculate score. | 10 critical findings | Score is not below 0. | TBD | Not Run | P0 | Yes |
| FIND-014 | Severity scoring | Count by severity | Mixed findings | 1. Calculate summary. | 1 critical, 2 high, 3 medium, 4 low, 5 info | Counts and totalFindings are accurate. | TBD | Not Run | P0 | Yes |
| FIND-015 | Severity scoring | Risk trend placeholder | Mixed findings | 1. Calculate summary. | mixed list | Summary includes `riskTrend` placeholder. | TBD | Not Run | P2 | Yes |
| FIND-016 | Findings engine | OWASP mapping for cryptographic failures | HTTPS finding | 1. Normalize observation. | no HTTPS | OWASP mapping includes Cryptographic Failures. | TBD | Not Run | P1 | Yes |
| FIND-017 | Findings engine | OWASP mapping for security misconfiguration | Header finding | 1. Normalize observation. | missing CSP | OWASP mapping includes Security Misconfiguration. | TBD | Not Run | P1 | Yes |
| FIND-018 | Findings engine | Business impact is present | Any scanner output | 1. Normalize finding. | missing HSTS | Business impact is non-empty and user-friendly. | TBD | Not Run | P0 | Yes |
| FIND-019 | Findings engine | Technical impact is present | Any scanner output | 1. Normalize finding. | cookie missing Secure | Technical impact is non-empty and precise. | TBD | Not Run | P0 | Yes |
| FIND-020 | Findings engine | Retest steps are present | Any scanner output | 1. Normalize finding. | exposed `.env` | Retest steps are available through recommendation. | TBD | Not Run | P1 | Yes |
| FIND-021 | AI remediation templates | Missing HTTPS template | Finding exists | 1. Generate recommendation. | missing HTTPS finding | Defensive explanation, fix, examples, and retest steps returned. | TBD | Not Run | P0 | Yes |
| FIND-022 | AI remediation templates | Missing HSTS template | Finding exists | 1. Generate recommendation. | missing HSTS | Nginx/Apache/Express/Next relevant guidance returned. | TBD | Not Run | P1 | Yes |
| FIND-023 | AI remediation templates | Exposed `.env` template | Finding exists | 1. Generate recommendation. | exposed `.env` | Recommends removal and rotation, no exploitation steps. | TBD | Not Run | P0 | Yes |
| FIND-024 | AI remediation templates | Unknown finding fallback | Unsupported finding type | 1. Generate recommendation. | custom category | Safe generic defensive guidance returned. | TBD | Not Run | P1 | Yes |
| FIND-025 | AI remediation templates | Guardrails prohibit offensive payloads | Finding context includes injection wording | 1. Generate recommendation. | suspicious context | Output avoids exploit payloads and bypass steps. | TBD | Not Run | P0 | Yes |

## Report Generation Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REP-001 | Report generation | Generate executive report | Completed scan exists | 1. POST `/scans/:id/reports`. | reportType EXECUTIVE | Report metadata stored with executive HTML snapshot. | TBD | Not Run | P0 | Yes |
| REP-002 | Report generation | Generate technical report | Completed scan exists | 1. POST `/scans/:id/reports`. | reportType TECHNICAL | Technical report includes methodology, jobs, detailed findings. | TBD | Not Run | P0 | Yes |
| REP-003 | Report generation | Generate full report | Completed scan exists | 1. POST `/scans/:id/reports`. | reportType FULL | Full report includes executive, technical, appendix, glossary. | TBD | Not Run | P0 | Yes |
| REP-004 | Report generation | Reject invalid report type | Completed scan exists | 1. POST invalid report type. | `INVALID` | Request returns 400. | TBD | Not Run | P0 | Yes |
| REP-005 | Report generation | Report includes organization and project | Scan has org/project | 1. Generate report. 2. Inspect HTML. | Demo scan | Organization and project names appear. | TBD | Not Run | P1 | Yes |
| REP-006 | Report generation | Report includes security score and risk rating | Scan has score | 1. Generate report. | score 78.5 | Score and risk rating displayed. | TBD | Not Run | P1 | Yes |
| REP-007 | Report generation | Report includes severity summary | Scan has mixed findings | 1. Generate report. | mixed severity findings | Severity counts and legend are accurate. | TBD | Not Run | P1 | Yes |
| REP-008 | Report generation | Report includes top 5 risks | Scan has >5 findings | 1. Generate executive/full report. | 8 findings | Only top 5 risks in executive top risks section. | TBD | Not Run | P1 | Yes |
| REP-009 | Report generation | Report includes recommendations | Finding has recommendation | 1. Generate technical/full report. | missing CSP finding | Recommendation text and code example included. | TBD | Not Run | P1 | Yes |
| REP-010 | Report generation | Report redacts sensitive evidence | Finding evidence includes fake secret | 1. Generate report. | repository secret finding | Full secret not present in report HTML/PDF. | TBD | Not Run | P0 | Yes |
| REP-011 | Report generation | Download report PDF | Report exists | 1. GET `/reports/:id/download`. | report id | Response returns PDF content type/disposition and non-empty body. | TBD | Not Run | P0 | Yes |
| REP-012 | Report generation | Get report metadata | Report exists | 1. GET `/reports/:id`. | report id | Report metadata returned for authorized user. | TBD | Not Run | P1 | Yes |
| REP-013 | Report generation | List reports | User has reports | 1. GET `/reports`. | user token | Only user's accessible reports returned. | TBD | Not Run | P1 | Yes |
| REP-014 | Report generation | Empty findings report | Completed scan has no findings | 1. Generate report. | clean scan | Report renders empty state without crash. | TBD | Not Run | P1 | Yes |
| REP-015 | Report generation | PDF fallback renderer | Playwright unavailable/mocked | 1. Render download. | stored HTML | Simple PDF fallback returns valid PDF bytes. | TBD | Not Run | P2 | Yes |

## Security And Access-Control Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-001 | Access control | User cannot list another org's projects | Two users/orgs exist | 1. Login User A. 2. GET projects. | User B project exists | User B project absent. | TBD | Not Run | P0 | Yes |
| SEC-002 | Access control | User cannot fetch another asset | Two users/assets exist | 1. GET `/assets/:foreignId`. | foreign asset id | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| SEC-003 | Access control | User cannot fetch another scan | Two users/scans exist | 1. GET `/scans/:foreignId`. | foreign scan id | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| SEC-004 | Access control | User cannot fetch another finding | Two users/findings exist | 1. GET `/findings/:foreignId`. | foreign finding id | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| SEC-005 | Access control | User cannot update another finding status | Foreign finding exists | 1. PATCH foreign finding status. | status FIXED | Request returns 404/403 and status unchanged. | TBD | Not Run | P0 | Yes |
| SEC-006 | Access control | User cannot generate report for foreign scan | Foreign scan exists | 1. POST `/scans/:foreignId/reports`. | FULL | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| SEC-007 | Access control | User cannot download foreign report | Foreign report exists | 1. GET `/reports/:id/download`. | foreign report id | Request returns 404/403. | TBD | Not Run | P0 | Yes |
| SEC-008 | SSRF protection | Block localhost scan target | Asset URL localhost or direct scanner call | 1. Run target validation. | `http://localhost:3000` | Target rejected by default. | TBD | Not Run | P0 | Yes |
| SEC-009 | SSRF protection | Block 127.0.0.1 | Scanner target validation enabled | 1. Validate target. | `http://127.0.0.1:8080` | Target rejected. | TBD | Not Run | P0 | Yes |
| SEC-010 | SSRF protection | Block IPv6 loopback | Scanner target validation enabled | 1. Validate target. | `http://[::1]:8080` | Target rejected. | TBD | Not Run | P0 | Yes |
| SEC-011 | SSRF protection | Block metadata IP | Scanner target validation enabled | 1. Validate target. | `http://169.254.169.254/latest/meta-data` | Target rejected. | TBD | Not Run | P0 | Yes |
| SEC-012 | SSRF protection | Block private IPv4 | Scanner target validation enabled | 1. Validate target. | `http://192.168.1.10` | Target rejected unless admin override enabled. | TBD | Not Run | P0 | Yes |
| SEC-013 | SSRF protection | Allow public HTTPS target | Scanner target validation enabled | 1. Validate target. | `https://example.com` | Target accepted. | TBD | Not Run | P1 | Yes |
| SEC-014 | Input validation | Reject invalid scan type | Authenticated user | 1. POST `/scans` invalid scanType. | `ACTIVE_ATTACK` | Request returns 400. | TBD | Not Run | P0 | Yes |
| SEC-015 | Input validation | Reject oversized OpenAPI spec | Project exists | 1. POST API asset with huge spec. | > configured max bytes | Request returns 400. | TBD | Not Run | P1 | Yes |
| SEC-016 | Input validation | Reject oversized repository ZIP | Repository asset exists | 1. POST REPO_SCAN with large base64 ZIP. | > `REPO_ZIP_MAX_BYTES` | Request returns 400 and no job queued. | TBD | Not Run | P0 | Yes |
| SEC-017 | Input validation | Reject invalid repository branch | Repository asset exists | 1. POST REPO_SCAN with shell-like branch. | `main;rm -rf` | Request returns 400. | TBD | Not Run | P0 | Yes |
| SEC-018 | Rate limiting | Auth login rate limited | Rate limiter enabled | 1. Send repeated bad login attempts. | 20 attempts same IP/email | Later attempts return 429 or configured throttle response. | TBD | Not Run | P1 | Yes |
| SEC-019 | Sensitive data masking | API bearer token not stored in scan summary | API scan queued with token | 1. Create API scan. 2. Inspect DB summary. | `Bearer secret-token` | Summary has boolean flag only, no token. | TBD | Not Run | P0 | Yes |
| SEC-020 | Sensitive data masking | Repository token not plaintext in queue/DB | Repository scan queued with token | 1. Create REPO_SCAN. 2. Inspect payload/DB. | `github-token-value` | Token encrypted in queue and absent from DB summary. | TBD | Not Run | P0 | Yes |
| SEC-021 | Audit logging | Registration audit log written | API running | 1. Register user. 2. Query audit logs if applicable. | new user | Registration audit event exists. | TBD | Not Run | P1 | Yes |
| SEC-022 | Audit logging | Login audit log written | User exists | 1. Login. 2. Query audit logs. | demo user | Login audit event exists. | TBD | Not Run | P1 | Yes |
| SEC-023 | Audit logging | Organization creation audit log written | Authenticated user | 1. Create organization. 2. Query audit logs. | org data | Audit log records action, entity type/id, user id. | TBD | Not Run | P1 | Yes |
| SEC-024 | Audit logging | Project creation audit log written | Org exists | 1. Create project. 2. Query audit logs. | project data | Audit log exists with project entity id. | TBD | Not Run | P1 | Yes |
| SEC-025 | Audit logging | Asset creation audit log written | Project exists | 1. Create asset. 2. Query audit logs. | website asset | Audit log exists with asset entity id. | TBD | Not Run | P1 | Yes |

## Performance And Reliability Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PERF-001 | Worker queue | Queue 50 website scans | DB, Redis, worker running | 1. Create 50 scans. 2. Wait for completion. | 50 test assets | No lost jobs; all scans terminal status. | TBD | Not Run | P1 | Yes |
| PERF-002 | Worker queue | Worker concurrency honored | Worker concurrency set to 2 | 1. Queue 10 slow scans. 2. Observe active jobs. | slow mock scanner | Active jobs do not exceed configured concurrency. | TBD | Not Run | P1 | Yes |
| PERF-003 | Worker queue | Failed check does not crash worker | One scanner module throws | 1. Dispatch scan. | mock failing module | Job marked failed, worker remains alive, scan completes/failed predictably. | TBD | Not Run | P0 | Yes |
| PERF-004 | Worker queue | Redis unavailable during scan creation | API running, Redis stopped | 1. POST `/scans`. | website asset | API returns service unavailable and scan queue failure recorded. | TBD | Not Run | P1 | Yes |
| PERF-005 | Worker queue | Worker restart resumes queued jobs | Redis has queued jobs | 1. Stop worker. 2. Queue scans. 3. Start worker. | 5 scans | Worker processes pending jobs. | TBD | Not Run | P1 | Yes |
| PERF-006 | Dashboard | Large dashboard dataset performance | Seed org with large dataset | 1. Load dashboard. | 100 assets, 100 scans, 1000 findings | API/UI responds within agreed SLA. | TBD | Not Run | P2 | Yes |
| PERF-007 | Finding detail page | Large evidence payload handling | Finding has many evidence records | 1. Open finding detail. | 100 evidence entries | Page renders without crash and remains usable. | TBD | Not Run | P2 | Yes |
| PERF-008 | Report generation | Full report for many findings | Scan has 100 findings | 1. Generate full report. | 100 findings with recommendations | Report generated under SLA and PDF downloads. | TBD | Not Run | P1 | Yes |
| PERF-009 | Scan orchestration | Duplicate scan clicks | Asset detail page open | 1. Double-click Start scan rapidly. | authorized scan modal | No unintended duplicate burst; UI disables during queueing. | TBD | Not Run | P1 | Yes |
| PERF-010 | Error handling | Database temporarily unavailable | API running, DB interrupted | 1. Call list endpoint. | `/dashboard` or `/projects` | User-safe error returned; no stack trace leaked. | TBD | Not Run | P1 | Yes |

## UI And UX Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UI-001 | Dashboard | Dashboard cards render | Logged-in user has demo data | 1. Navigate to `/dashboard`. | demo seed data | Score, total assets, scans, critical findings, latest score visible. | TBD | Not Run | P0 | Yes |
| UI-002 | Dashboard | Empty dashboard state | New user with no org/data | 1. Login new user. 2. Open dashboard. | new account | Clear empty state and next action are shown. | TBD | Not Run | P1 | Yes |
| UI-003 | Dashboard | Loading skeletons render | API delayed/mocked | 1. Open dashboard. | delayed responses | Loading states appear before data. | TBD | Not Run | P2 | Yes |
| UI-004 | Dashboard | Error state render | API returns error | 1. Open dashboard with API failure. | 500 mock | User-safe error state appears. | TBD | Not Run | P1 | Yes |
| UI-005 | Scan authorization | Modal requires confirmation | Asset detail page open | 1. Click Start Scan. 2. Click submit without checkbox. | website asset | Error message says authorization confirmation required. | TBD | Not Run | P0 | Yes |
| UI-006 | Scan authorization | Authorization text visible | Scan modal open | 1. Inspect modal. | website asset | Exact text is visible: `I confirm that I own this asset or have explicit authorization to scan it.` | TBD | Not Run | P0 | Yes |
| UI-007 | Finding detail page | Finding detail shows all core sections | Finding exists | 1. Open `/findings/:id`. | demo finding | Severity, status, evidence, impacts, fix, retest steps visible. | TBD | Not Run | P0 | Yes |
| UI-008 | Finding detail page | Status change confirmation | Finding detail open | 1. Change status. 2. Confirm prompt. | status `RISK_ACCEPTED` | Confirmation appears and status updates after acceptance. | TBD | Not Run | P1 | Yes |
| UI-009 | Report generation | Generate report button loading state | Scan detail open | 1. Click export/generate report. | completed scan | Button/page indicates loading and then success or user-safe error. | TBD | Not Run | P1 | Yes |
| UI-010 | Asset management | Repository scan fields are visible only for repository assets | Repository and website assets exist | 1. Open scan modal for each asset type. | REPOSITORY and WEBSITE assets | Repository branch/token/ZIP fields show only for repository asset. | TBD | Not Run | P1 | Yes |

## Retest Workflow Test Cases

| Test Case ID | Module | Scenario | Preconditions | Test Steps | Test Data | Expected Result | Actual Result | Status | Priority | Automation Candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RETEST-001 | Retest workflow | Previous finding marked fixed | Asset has prior open finding | 1. Run new scan without same finding. | prior missing CSP, new clean headers | Prior finding status becomes `FIXED` and `fixedAt` set. | TBD | Not Run | P0 | Yes |
| RETEST-002 | Retest workflow | Finding remains open when still detected | Asset has prior open finding | 1. Run new scan with same finding. | same evidence key | Prior/current workflow does not incorrectly mark fixed. | TBD | Not Run | P0 | Yes |
| RETEST-003 | Retest workflow | Retest required status preserved until scan | Finding status `RETEST_REQUIRED` | 1. Open finding detail. 2. Run scan. | retest finding | Status changes based on new scan evidence. | TBD | Not Run | P1 | Yes |
| RETEST-004 | Retest workflow | False positive not auto-fixed | Finding status `FALSE_POSITIVE` | 1. Run scan without finding. | false positive finding | Status remains policy-consistent and is not misleadingly reopened. | TBD | Not Run | P1 | Yes |
| RETEST-005 | Retest workflow | Risk accepted not auto-fixed without policy decision | Finding status `RISK_ACCEPTED` | 1. Run clean scan. | accepted risk finding | Workflow follows configured policy and audit trail is retained. | TBD | Not Run | P2 | Yes |

