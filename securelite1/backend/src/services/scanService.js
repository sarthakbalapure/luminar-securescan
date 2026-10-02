import { Scan } from "../models/Scan.js";
import { URL } from "url";
import { sendNewVulnerabilityAlert, sendVulnerabilityAlert } from "./emailService.js";
import { runAggregateScans, runIndividualScan } from "./scanEngineService.js";

const detectNewIssues = ({ previousScan, nextIssues }) => {
  if (!previousScan) {
    return nextIssues;
  }

  const previousTitles = new Set(previousScan.issues.map((issue) => issue.title));
  return nextIssues.filter((issue) => !previousTitles.has(issue.title));
};

export const createAndRunScan = async ({ user, targetUrl, scanType = "full", triggeredBy = "manual" }) => {
  const monthlyLimit = user.plan?.scanLimitMonthly ?? 10;
  const usedScans = user.plan?.scansUsedThisMonth ?? 0;

  if (user.role !== "owner" && usedScans >= monthlyLimit) {
    const error = new Error("You have reached your monthly scan limit for the Starter plan.");
    error.statusCode = 403;
    throw error;
  }

  const domain = new URL(targetUrl).hostname;
  const previousScan = await Scan.findOne({ user: user._id, targetUrl }).sort({ createdAt: -1 });

  const scan = await Scan.create({
    user: user._id,
    targetUrl,
    domain,
    scanType,
    triggeredBy,
    status: "running"
  });

  try {
    const results =
      scanType === "full"
        ? await runAggregateScans({ targetUrl })
        : await runIndividualScan({ scanType, targetUrl }).then((result) => ({
            source: result.source,
            findingsByType: {
              [scanType]: {
                status: "completed",
                issues: result.issues
              }
            },
            issues: result.issues,
            securityScore: Math.max(0, 100 - result.issues.length * 15),
            riskLevel:
              result.issues.some((issue) => ["critical", "high"].includes(issue.severity))
                ? "High"
                : result.issues.some((issue) => issue.severity === "medium")
                  ? "Medium"
                  : "Low",
            summary:
              result.issues.length > 0
                ? "We found a few security issues in this focused scan."
                : "This focused scan did not find any immediate issues.",
            fixes: result.issues.map((issue) => ({
              label: issue.title,
              action: issue.recommendation
            })),
            ssl: result.ssl || {
              isValid: true,
              issuer: "",
              validTo: "",
              message: ""
            },
            malware: result.malware || {
              grade: "",
              riskScore: 0,
              reputation: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, timeout: 0 },
              message: ""
            },
            openPorts: result.openPorts || [],
            rawFindings: { [scanType]: result.raw }
          }));

    scan.status = "completed";
    scan.source = results.source;
    scan.securityScore = results.securityScore;
    scan.riskLevel = results.riskLevel;
    scan.summary = results.summary;
    scan.issues = results.issues;
    scan.findingsByType = {
      sql: { status: "skipped", issues: [] },
      xss: { status: "skipped", issues: [] },
      ssl: { status: "skipped", issues: [] },
      ports: { status: "skipped", issues: [] },
      config: { status: "skipped", issues: [] },
      malware: { status: "skipped", issues: [] },
      ...results.findingsByType
    };
    scan.fixes = results.fixes;
    scan.openPorts = results.openPorts;
    scan.ssl = results.ssl;
    scan.malware = results.malware;
    scan.rawFindings = results.rawFindings;
    await scan.save();

    if (user.role !== "owner") {
      user.plan.scansUsedThisMonth = usedScans + 1;
      await user.save();
    }

    const hasUrgentIssues = results.issues.some((issue) => ["critical", "high"].includes(issue.severity));
    if (user.alertPreferences?.emailAlerts && hasUrgentIssues) {
      await sendVulnerabilityAlert({
        to: user.email,
        name: user.name,
        scan
      });
      scan.lastAlertSentAt = new Date();
      await scan.save();
    }

    const newIssues = detectNewIssues({
      previousScan,
      nextIssues: results.issues
    });

    if (user.alertPreferences?.emailAlerts && newIssues.length && triggeredBy === "scheduler") {
      await sendNewVulnerabilityAlert({
        to: user.email,
        name: user.name,
        scan,
        newIssues
      });
    }

    return scan;
  } catch (error) {
    scan.status = "failed";
    scan.summary = "The scan could not be completed. Please verify the website URL and scanner configuration.";
    scan.rawFindings = { error: error.message };
    await scan.save();
    throw error;
  }
};
