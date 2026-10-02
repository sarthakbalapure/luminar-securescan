export type SubscriptionOverview = {
  organizationId: string;
  subscription: {
    id: string;
    planCode: "PLUS" | "PRO" | "MAX";
    planName: string;
    monthlyScanLimit: number;
    monthlyFixRequestLimit: number;
    dailyScanEnabled: boolean;
    reportLevel: "BASIC" | "DETAILED";
    validFrom: string;
    validTo?: string | null;
  };
  usage: {
    monthKey: string;
    scansUsed: number;
    fixRequestsUsed: number;
  };
  scansRemaining: number;
  fixRequestsRemaining: number;
  scanUsagePercent: number;
  detailedReportsEnabled: boolean;
  dailyScanMessage: string;
};

export function planDisplayName(code?: string) {
  if (code === "MAX") return "Max";
  if (code === "PRO") return "Pro";
  return "Plus";
}
