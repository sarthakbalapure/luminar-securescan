# SecureLite

SecureLite is a beginner-friendly cybersecurity SaaS for small businesses. Public users can sign up on a Starter plan, scan a website with one click, review plain-English findings, track scan history, and receive email alerts for higher-risk issues. The platform also includes a separate owner login for internal admin monitoring.

## 1. Project folder structure

```text
securelite/
  backend/
    package.json
    .env.example
    src/
      app.js
      server.js
      config/
        db.js
        env.js
      controllers/
        adminController.js
        authController.js
        scanController.js
      middlewares/
        auth.js
        errorHandler.js
        validate.js
      models/
        User.js
        Scan.js
      routes/
        adminRoutes.js
        authRoutes.js
        scanRoutes.js
      jobs/
        weeklyScanJob.js
      services/
        customScannerService.js
        emailService.js
        nmapService.js
        reportService.js
        scanEngineService.js
        scanService.js
        zapScannerService.js
      utils/
        appError.js
        asyncHandler.js
        jwt.js
        validators.js
      seeds/
        demoUser.js
        ownerUser.js
  frontend/
    package.json
    .env.example
    index.html
    vite.config.js
    src/
      App.jsx
      main.jsx
      api/
        client.js
      components/
        AuthForm.jsx
        AuthShell.jsx
        InfrastructureCard.jsx
        IssueList.jsx
        Layout.jsx
        ScanForm.jsx
        ScanHistoryTable.jsx
        ScoreCard.jsx
      context/
        AuthContext.jsx
      hooks/
        useAuth.js
      pages/
        DashboardPage.jsx
        HomePage.jsx
        LoginPage.jsx
        SignupPage.jsx
      styles/
        global.css
  README.md
```

## 2. Backend code overview

### API endpoints

- `POST /api/auth/signup` creates an account and returns a JWT.
- `POST /api/auth/login` signs in a user and returns a JWT.
- `GET /api/auth/me` returns the logged-in user's profile.
- `POST /api/scans` runs a full parallel website security scan for the submitted URL.
- `POST /api/scans/sql` runs the SQL injection module.
- `POST /api/scans/xss` runs the XSS and CSRF module.
- `POST /api/scans/ssl` runs the SSL and HTTPS module.
- `POST /api/scans/ports` runs the port-scanning module.
- `POST /api/scans/config` runs the configuration and header module.
- `GET /api/scans` returns the current user's scan history.
- `GET /api/scans/:id` returns one scan report.
- `GET /api/admin/overview` returns owner-only platform metrics.
- `GET /api/health` confirms the backend is running.

### Backend behavior

- Uses Express with Helmet, CORS, rate limiting, and centralized error handling.
- Uses JWT auth with protected scan routes.
- Supports `owner` and `public` roles.
- Adds a Starter subscription plan at Rs 50/month for public users.
- Uses MongoDB via Mongoose models for `User` and `Scan`.
- Runs multiple scan modules in parallel and aggregates the results into one report.
- Uses OWASP ZAP style integration for app-layer findings, Nmap for ports when available, and custom Node.js checks for SSL and headers.
- Includes weekly scheduled scans using cron when enabled.
- Converts technical findings into non-technical explanations.
- Includes a starter fallback mode so the app still works if ZAP or Nmap are not installed locally.

## 3. Frontend code overview

The React frontend provides:

- A public landing page with pricing and separate owner/customer login entry points.
- Login and signup screens for new users.
- A clean public user dashboard with one-click scan submission.
- A separate owner dashboard with customer and scan metrics.
- An animated security score circle.
- Plain-English issue cards with "Fix this" actions.
- A scan history table.
- A dedicated results page for each scan report.
- SSL and open-port summary cards.
- Motion-based transitions and scan loading animations.

The UI is intentionally simple, responsive, and written for non-technical users.

## 4. Database schema

### User model

```js
{
  name: String,
  email: String,
  password: String,
  companyName: String,
  role: "owner" | "public",
  plan: {
    code: String,
    name: String,
    priceInr: Number,
    billingCycle: String,
    status: String,
    scanLimitMonthly: Number,
    scansUsedThisMonth: Number,
    renewalDate: Date
  },
  alertPreferences: {
    emailAlerts: Boolean
  }
}
```

### Scan model

```js
{
  user: ObjectId,
  targetUrl: String,
  domain: String,
  scanType: "full" | "sql" | "xss" | "ssl" | "ports" | "config",
  triggeredBy: "manual" | "scheduler",
  status: "queued" | "running" | "completed" | "failed",
  source: "mock" | "zap" | "nmap" | "hybrid",
  securityScore: Number,
  riskLevel: "Low" | "Medium" | "High",
  summary: String,
  issues: [
    {
      scanner: String,
      type: String,
      severity: "critical" | "high" | "medium" | "low" | "info",
      title: String,
      technicalDetails: String,
      plainEnglish: String,
      recommendation: String
    }
  ],
  findingsByType: {
    sql: { status: String, issues: [] },
    xss: { status: String, issues: [] },
    ssl: { status: String, issues: [] },
    ports: { status: String, issues: [] },
    config: { status: String, issues: [] }
  },
  fixes: [{ label: String, action: String }],
  openPorts: [{ port: Number, status: String }],
  ssl: {
    isValid: Boolean,
    issuer: String,
    validTo: String,
    message: String
  }
}
```

## 5. Step-by-step setup instructions

### Prerequisites

- Node.js 20+
- MongoDB running locally or a MongoDB Atlas connection string
- Optional: OWASP ZAP running locally if you want live ZAP-backed scans
- Optional: Nmap installed locally if you want live port scans

### Backend setup

1. Open a terminal in `securelite/backend`.
2. Copy `.env.example` to `.env`.
3. Update `MONGO_URI`, `JWT_SECRET`, and email settings.
4. Leave `USE_MOCK_SCANNER=true` for quick local setup, or set it to `false` and start OWASP ZAP and Nmap.
5. Enable weekly scans with `ENABLE_WEEKLY_SCANS=true` if you want the cron job active.
6. Run:

```bash
npm install
npm run dev
```

### Demo login

If you want a ready-made account, run this once inside `securelite/backend`:

```bash
npm run seed:demo
npm run seed:owner
```

Public demo credentials:

- Email: `demo@securelite.com`
- Password: `DemoPass123`

Owner credentials:

- Email: `owner@securelite.com`
- Password: `OwnerPass123`

### Frontend setup

1. Open a second terminal in `securelite/frontend`.
2. Copy `.env.example` to `.env`.
3. Confirm `VITE_API_URL=http://localhost:5000/api`.
4. Install the animation dependencies through `npm install`.
5. Run:

```bash
npm install
npm run dev
```

### Production deployment notes

- Put the backend behind HTTPS and a reverse proxy like Nginx.
- Store secrets in your cloud secret manager, not in source control.
- Point MongoDB to a managed production cluster.
- Move scans to a job queue if scan volume grows.
- Configure SMTP or a transactional email service such as SendGrid, Postmark, or SES.

## 6. Example API request/response

### Signup request

```http
POST /api/auth/signup
Content-Type: application/json

{
  "name": "Jane Owner",
  "email": "jane@example.com",
  "password": "StrongPass1",
  "companyName": "Bright Bakery"
}
```

### Signup response

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "660123abc456def789000111",
      "name": "Jane Owner",
      "email": "jane@example.com",
      "companyName": "Bright Bakery",
      "alertPreferences": {
        "emailAlerts": true
      }
    }
  }
}
```

### Start scan request

```http
POST /api/scans
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "targetUrl": "https://example.com"
}
```

### Focused scan request

```http
POST /api/scans/xss
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "targetUrl": "https://example.com/contact"
}
```

### Start scan response

```json
{
  "success": true,
  "message": "Scan completed",
  "data": {
    "_id": "660123abc456def789000999",
    "targetUrl": "https://example.com",
    "domain": "example.com",
    "status": "completed",
    "source": "mock",
    "scanType": "full",
    "securityScore": 70,
    "riskLevel": "Medium",
    "summary": "Your site looks fairly healthy, but there are a few issues worth fixing soon to reduce risk.",
    "issues": [
      {
        "scanner": "zap-mock",
        "type": "sqli",
        "severity": "low",
        "title": "Possible form or URL injection risk",
        "technicalDetails": "Demo finding: input filtering should be reviewed.",
        "plainEnglish": "Someone may be able to trick your website into accepting unsafe input, which can expose or change important data.",
        "recommendation": "Have your developer use parameterized database queries, validate form inputs, and block dangerous characters."
      }
    ],
    "findingsByType": {
      "sql": { "status": "completed", "issues": [] },
      "xss": { "status": "completed", "issues": [] },
      "ssl": { "status": "completed", "issues": [] },
      "ports": { "status": "completed", "issues": [] },
      "config": { "status": "completed", "issues": [] }
    }
  }
}
```

## 7. Suggestions for scaling this SaaS

- Move scans into a background worker queue with BullMQ, RabbitMQ, or AWS SQS so the API stays fast.
- Store full scan artifacts separately from dashboard summaries to keep MongoDB lightweight.
- Add role-based access for agencies managing multiple client websites.
- Add recurring scan schedules and weekly executive summary emails.
- Replace the current fixed Starter-plan model with real recurring billing using Stripe or Razorpay.
- Add team comments and fix-tracking so developers can collaborate with owners.
- Expand beyond websites into DNS checks, domain monitoring, and dark web exposure alerts.

## Security best practices included

- Password hashing with bcrypt.
- JWT-based route protection.
- Input validation with `express-validator`.
- Rate limiting and security headers.
- Minimal sensitive data exposure in API responses.
- Clear error responses without exposing secrets.

## Notes about the scanner

- When `USE_MOCK_SCANNER=true`, SecureLite remains fully runnable and demo-friendly.
- When `USE_MOCK_SCANNER=false`, the backend expects OWASP ZAP to be reachable via `ZAP_BASE_URL`.
- The current code structure is designed so you can swap in additional scanners later without changing the React app.

## Real-world completeness notes

The project is now much closer to a usable MVP, but these areas are still the next production upgrades:

- Real payment collection for the Rs 50/month plan is not yet connected.
- The current scan request runs inline; production should move this to background workers and queue orchestration.
- ZAP integration is supported, but the mock mode is still the default for easier local setup.
- Weekly scans are supported through cron, but plan renewal and monthly usage reset should still be automated with a dedicated billing lifecycle job.
