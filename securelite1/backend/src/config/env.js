import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/securelite",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  emailFrom: process.env.EMAIL_FROM || "SecureLite <alerts@example.com>",
  zapBaseUrl: process.env.ZAP_BASE_URL || "http://127.0.0.1:8080",
  zapApiKey: process.env.ZAP_API_KEY || "",
  virusTotalApiKey: process.env.VIRUSTOTAL_API_KEY || "",
  useMockScanner: String(process.env.USE_MOCK_SCANNER || "true") === "true",
  enableWeeklyScans: String(process.env.ENABLE_WEEKLY_SCANS || "false") === "true",
  weeklyScanCron: process.env.WEEKLY_SCAN_CRON || "0 9 * * 1"
};
