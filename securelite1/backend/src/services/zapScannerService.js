import axios from "axios";
import { env } from "../config/env.js";

const mockSqlFindings = (targetUrl) => [
  {
    scanner: "zap-mock",
    type: "sqli",
    severity: targetUrl.includes("admin") ? "medium" : "low",
    technicalDetails: "Mock SQL injection check flagged query and form input review as recommended."
  }
];

const mockXssFindings = (targetUrl) => {
  const issues = [
    {
      scanner: "zap-mock",
      type: "xss",
      severity: targetUrl.includes("shop") || targetUrl.includes("store") ? "medium" : "low",
      technicalDetails: "Mock XSS scan found reflected input patterns worth reviewing."
    }
  ];

  if (targetUrl.includes("contact") || targetUrl.includes("form")) {
    issues.push({
      scanner: "zap-mock",
      type: "csrf",
      severity: "low",
      technicalDetails: "Mock CSRF check suggests adding request-verification tokens to forms."
    });
  }

  return issues;
};

const runZapAlertQuery = async ({ targetUrl, keyword }) => {
  try {
    const alertsResponse = await axios.get(`${env.zapBaseUrl}/JSON/alert/view/alerts/`, {
      params: { apikey: env.zapApiKey, baseurl: targetUrl },
      timeout: 8000
    });

    const alerts = Array.isArray(alertsResponse.data?.alerts) ? alertsResponse.data.alerts : [];

    return alerts
      .filter((alert) => alert.alert?.toLowerCase().includes(keyword))
      .map((alert) => ({
        scanner: "zap",
        type: keyword.includes("sql") ? "sqli" : keyword.includes("cross") ? "xss" : "csrf",
        severity: (alert.risk || "low").toLowerCase(),
        technicalDetails: `${alert.alert}: ${alert.description || "See ZAP output for details."}`
      }));
  } catch (_error) {
    return [
      {
        scanner: "zap-fallback",
        type: keyword.includes("sql") ? "sqli" : keyword.includes("cross") ? "xss" : "csrf",
        severity: "info",
        technicalDetails: "OWASP ZAP could not be reached, so SecureLite used a safe fallback for this check."
      }
    ];
  }
};

export const runSqlScan = async ({ targetUrl }) => {
  if (env.useMockScanner) {
    return {
      source: "mock",
      issues: mockSqlFindings(targetUrl)
    };
  }

  return {
    source: "zap",
    issues: await runZapAlertQuery({ targetUrl, keyword: "sql" })
  };
};

export const runXssScan = async ({ targetUrl }) => {
  if (env.useMockScanner) {
    return {
      source: "mock",
      issues: mockXssFindings(targetUrl)
    };
  }

  const issues = [
    ...(await runZapAlertQuery({ targetUrl, keyword: "cross" })),
    ...(await runZapAlertQuery({ targetUrl, keyword: "csrf" }))
  ];

  return {
    source: "zap",
    issues
  };
};
