import { URL } from "url";
import { env } from "../config/env.js";
import { runSqlScan, runXssScan } from "./zapScannerService.js";
import { runPortScan } from "./nmapService.js";
import { runConfigCheck, runSslCheck } from "./customScannerService.js";
import { runMalwareScan } from "./virusTotalService.js";
import { buildFixList, buildSummary, calculateSecurityScore, getRiskLevel, toPlainIssue } from "./reportService.js";

const normalizeIssues = (issues = []) => issues.map(toPlainIssue);

export const runIndividualScan = async ({ scanType, targetUrl }) => {
  const { hostname } = new URL(targetUrl);

  if (scanType === "sql") {
    const result = await runSqlScan({ targetUrl });
    return { scanType, source: result.source, issues: normalizeIssues(result.issues), raw: result };
  }

  if (scanType === "xss") {
    const result = await runXssScan({ targetUrl });
    return { scanType, source: result.source, issues: normalizeIssues(result.issues), raw: result };
  }

  if (scanType === "ssl") {
    const result = await runSslCheck({ hostname });
    return { scanType, source: "hybrid", issues: normalizeIssues(result.issues), ssl: result, raw: result };
  }

  if (scanType === "ports") {
    const result = await runPortScan({ hostname, useMockScanner: env.useMockScanner });
    return {
      scanType,
      source: result.source,
      issues: normalizeIssues(result.issues),
      openPorts: result.openPorts,
      raw: result
    };
  }

  if (scanType === "malware") {
    const result = await runMalwareScan({ targetUrl });
    return {
      scanType,
      source: result.source,
      issues: normalizeIssues(result.issues),
      malware: {
        grade: result.grade,
        riskScore: result.riskScore,
        reputation: result.reputation,
        message:
          result.grade === "Clean"
            ? "No strong malware or domain reputation warnings were returned for this URL."
            : result.grade === "Unknown"
              ? "Malware reputation could not be confirmed right now."
              : "This URL has reputation signals that deserve attention."
      },
      raw: result
    };
  }

  const result = await runConfigCheck({ targetUrl });
  return { scanType: "config", source: "hybrid", issues: normalizeIssues(result.issues), raw: result };
};

export const runAggregateScans = async ({ targetUrl }) => {
  const scanTypes = ["sql", "xss", "ssl", "ports", "config", "malware"];
  const results = await Promise.all(scanTypes.map((scanType) => runIndividualScan({ scanType, targetUrl })));

  const findingsByType = results.reduce(
    (accumulator, result) => ({
      ...accumulator,
      [result.scanType]: {
        status: "completed",
        issues: result.issues
      }
    }),
    {}
  );

  const allIssues = results.flatMap((result) => result.issues);
  const sslResult = results.find((result) => result.scanType === "ssl")?.ssl || {
    isValid: true,
    issuer: "",
    validTo: "",
    message: ""
  };
  const portsResult = results.find((result) => result.scanType === "ports")?.openPorts || [];
  const malwareResult = results.find((result) => result.scanType === "malware")?.malware || {
    grade: "",
    riskScore: 0,
    reputation: { malicious: 0, suspicious: 0, harmless: 0, undetected: 0, timeout: 0 },
    message: ""
  };
  const securityScore = calculateSecurityScore(allIssues, sslResult, portsResult);

  return {
    source: env.useMockScanner ? "mock" : "hybrid",
    findingsByType,
    issues: allIssues,
    securityScore,
    riskLevel: getRiskLevel(securityScore),
    summary: buildSummary({ securityScore, issues: allIssues }),
    fixes: buildFixList(allIssues),
    ssl: sslResult,
    malware: malwareResult,
    openPorts: portsResult,
    rawFindings: results.reduce(
      (accumulator, result) => ({
        ...accumulator,
        [result.scanType]: result.raw
      }),
      {}
    )
  };
};
