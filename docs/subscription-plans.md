# LuminarIQ SecureScan Subscription Plans

## Overview

LuminarIQ SecureScan provides Plus, Pro, and Max plans. Plans are assigned to organizations, so every member of an organization shares the same monthly limits and report capabilities. Payment processing is not included in this phase; a platform administrator activates and changes plans manually.

All limits are enforced by the API. Hiding a frontend control does not bypass scan, report, fix-request, membership, or administrator checks.

## Feature Comparison

| Feature | Plus | Pro | Max |
|---|---:|---:|---:|
| Display price | INR 999/month | INR 2,999/month | INR 7,999/month |
| Scans per calendar month | 3 | 10 | 30 |
| Report level | Basic | Detailed | Detailed |
| Developer remediation guidance | No | Yes | Yes |
| Code/configuration examples | No | Yes | Yes |
| Daily scan capability | No | No | Yes |
| Admin fix-help requests per month | 0 | 0 | 10 |

Prices are display values only. No charge is collected by the application.

## Scan Limits

Before a scan is created, the API loads the active organization subscription and the current `SubscriptionUsage` record. A scan is rejected when `scansUsed` is equal to the plan limit.

Usage increments only after the scan database record is created. If the queue operation fails, the reserved usage is rolled back. This prevents failed queue submissions from consuming a customer scan.

The current usage period uses a UTC month key in `YYYY-MM` format. For example, September 2026 is `2026-09`.

When a new month starts, the first subscription operation creates a new usage row automatically. Previous usage rows are retained for audit and analytics.

## Report Differences

### Plus Basic Report

Plus reports contain the asset and scan summary, security score, severity counts, finding titles, severity, affected URL, issue description, and a basic recommendation. Detailed business impact, technical impact, evidence, code/configuration examples, retest instructions, and remediation roadmap are omitted.

If a Plus user requests a detailed report type, the backend safely generates a Basic report and adds this note:

> Upgrade to Pro or Max to unlock detailed remediation steps and developer-ready fix guidance.

### Pro and Max Detailed Reports

Pro and Max reports include detailed findings, evidence summary, business and technical impact, developer-ready remediation, code/configuration examples, retest steps, OWASP mapping, and a prioritized remediation roadmap.

Max reports also show the number of admin fix-help requests remaining in the current month.

## Fix Support Requests

Only an organization with an active Max plan can create a fix support request. A customer opens the related finding and selects **Request Admin Help**. The request is linked to the organization, project, asset, scan, finding, and requesting user.

The API verifies that the finding belongs to the customer's organization and that fewer than 10 requests have been used in the current month. Plus and Pro customers receive `Fix support requests are available only in Max plan.` Max customers at the limit receive `You have used all 10 admin support requests for this month.`

Customers can view requests at `/fix-requests`, read the administrator response, and reply while the request is open.

Administrators use `/admin/fix-requests` to assign, respond to, and move requests through `OPEN`, `IN_REVIEW`, `WAITING_FOR_CUSTOMER`, `RESOLVED`, and `CLOSED`.

## Admin Subscription Assignment

1. Sign in with a platform administrator account.
2. Open `/admin/subscriptions`.
3. Select Plus, Pro, or Max for an organization.
4. Choose **Assign**, or open **Manage** to set validity dates and notes.
5. Confirm the new active subscription and usage limits in the table.

Changing a plan deactivates the previous assignment and creates a new active assignment. Current-month usage is retained. Administrators can use **Reset usage** when an approved manual correction is required; that action is audit logged.

The demo seed assigns the demo organization to Max so all features can be tested:

```text
Customer: vishal@example.com / User@123
Admin: admin@luminarsecure.com / Admin@123
```

## APIs

Customer endpoints:

```text
GET  /subscriptions/plans
GET  /subscriptions/current?organizationId=<id>
GET  /subscriptions/usage?organizationId=<id>
POST /fix-requests
GET  /fix-requests
GET  /fix-requests/:id
POST /fix-requests/:id/reply
```

Administrator endpoints:

```text
GET   /admin/subscriptions
PATCH /admin/organizations/:organizationId/subscription
POST  /admin/organizations/:organizationId/subscription/usage/reset
GET   /admin/fix-requests
GET   /admin/fix-requests/:id
PATCH /admin/fix-requests/:id/status
PATCH /admin/fix-requests/:id/assign
POST  /admin/fix-requests/:id/respond
```

In local browser requests, these routes are reached through the existing Next.js `/api/backend` proxy.

## Audit Events

Subscription and support actions write events including plan assignment/change, scan usage increments, scan limit reached, Basic or Detailed report generation, fix request creation, response, status change, and fix-request limit reached.

## Troubleshooting

### No active subscription found

Apply the latest Prisma migration and run the seed. New organizations receive Plus automatically. Existing organizations are migrated from their legacy plan fields.

```powershell
docker compose up -d
corepack pnpm --filter @luminar-iq/api prisma:migrate
corepack pnpm --filter @luminar-iq/api prisma:seed
```

### Usage appears from a previous month

Confirm the server clock and inspect the UTC `monthKey`. A fresh row is created when the UTC calendar month changes.

### Scan remains disabled after an admin upgrade

Refresh the asset page so it reloads the backend subscription. If the organization still has an expired assignment, verify `validFrom`, `validTo`, and status in the admin subscription screen.

### Fix-help button is unavailable

The organization must have an active Max plan and remaining monthly requests. The finding must also belong to that organization.

## Daily Scan Status

Max includes daily scan capability. The backend exposes a scheduler-ready service and the UI shows availability, but automatic scheduling configuration is a placeholder in this phase. Manual scans still count toward the 30-scan monthly limit.

## Future Payment Gateway

Payment gateway integration is planned for a future phase. Current subscription activation is managed manually by Admin. Subscription records include placeholder provider, payment status, and reference fields so billing can be added without changing the plan enforcement model.
