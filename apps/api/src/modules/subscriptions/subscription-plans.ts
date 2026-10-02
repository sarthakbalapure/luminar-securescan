import { PlanCode, ReportLevel } from "@prisma/client";

export const SUBSCRIPTION_PLANS = {
  PLUS: {
    name: PlanCode.PLUS,
    displayName: "Plus",
    monthlyScanLimit: 3,
    reportLevel: ReportLevel.BASIC,
    detailedRemediation: false,
    dailyScanEnabled: false,
    monthlyFixRequestLimit: 0,
    priceMonthly: 999,
    currency: "INR",
    assetLimit: 5,
    description: "Basic security scanning for small websites and early users.",
    features: ["3 scans per month", "Basic security report", "Security score", "Severity summary", "Basic recommendations"],
  },
  PRO: {
    name: PlanCode.PRO,
    displayName: "Pro",
    monthlyScanLimit: 10,
    reportLevel: ReportLevel.DETAILED,
    detailedRemediation: true,
    dailyScanEnabled: false,
    monthlyFixRequestLimit: 0,
    priceMonthly: 2999,
    currency: "INR",
    assetLimit: 25,
    description: "Professional security scanning with developer-ready remediation guidance.",
    features: ["10 scans per month", "Detailed technical report", "Business and technical impact", "Code examples", "Retest steps", "OWASP mapping"],
  },
  MAX: {
    name: PlanCode.MAX,
    displayName: "Max",
    monthlyScanLimit: 30,
    reportLevel: ReportLevel.DETAILED,
    detailedRemediation: true,
    dailyScanEnabled: true,
    monthlyFixRequestLimit: 10,
    priceMonthly: 7999,
    currency: "INR",
    assetLimit: 100,
    description: "Advanced monitoring with admin-assisted remediation support.",
    features: ["30 scans per month", "Daily scan support", "Detailed technical report", "10 admin fix-help requests per month", "Priority support placeholder"],
  },
} as const;

export function planLimits(planCode: PlanCode) {
  return SUBSCRIPTION_PLANS[planCode];
}

export function currentMonthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
