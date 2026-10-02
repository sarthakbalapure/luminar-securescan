import axios from "axios";
import { URL } from "url";
import net from "net";
import tls from "tls";
import { env } from "../config/env.js";

const commonPorts = [21, 22, 80, 443, 3306, 8080];

const checkPort = (hostname, port, timeout = 1200) =>
  new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(timeout);
    socket.once("connect", () => {
      socket.destroy();
      resolve({ port, status: "open" });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ port, status: "closed" });
    });
    socket.once("error", () => {
      socket.destroy();
      resolve({ port, status: "closed" });
    });

    socket.connect(port, hostname);
  });

const inspectSsl = (hostname) =>
  new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
        rejectUnauthorized: false
      },
      () => {
        const certificate = socket.getPeerCertificate();
        resolve({
          isValid: Boolean(certificate.valid_to),
          issuer: certificate.issuer?.O || certificate.issuer?.CN || "Unknown issuer",
          validTo: certificate.valid_to || "",
          message: certificate.valid_to
            ? "A certificate was detected for this domain."
            : "No valid certificate details were returned."
        });
        socket.end();
      }
    );

    socket.on("error", () =>
      resolve({
        isValid: false,
        issuer: "",
        validTo: "",
        message: "We could not confirm a valid HTTPS certificate."
      })
    );
  });

const buildMockAlerts = (targetUrl) => {
  const host = new URL(targetUrl).hostname;
  const issues = [];

  if (host.includes("shop") || host.includes("store")) {
    issues.push({ type: "xss", severity: "medium", technicalDetails: "Demo finding: reflected content in search parameter." });
  }

  issues.push({ type: "sqli", severity: "low", technicalDetails: "Demo finding: input filtering should be reviewed." });

  return issues;
};

const fetchZapAlerts = async (targetUrl) => {
  const params = {
    apikey: env.zapApiKey,
    url: targetUrl,
    recurse: true
  };

  const spiderResponse = await axios.get(`${env.zapBaseUrl}/JSON/spider/action/scan/`, { params });
  const spiderId = spiderResponse.data.scan;

  let status = "0";
  while (status !== "100") {
    const statusResponse = await axios.get(`${env.zapBaseUrl}/JSON/spider/view/status/`, {
      params: { apikey: env.zapApiKey, scanId: spiderId }
    });
    status = statusResponse.data.status;
    if (status !== "100") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  await axios.get(`${env.zapBaseUrl}/JSON/ascan/action/scan/`, {
    params: { apikey: env.zapApiKey, url: targetUrl, recurse: true, inScopeOnly: false }
  });

  const alertsResponse = await axios.get(`${env.zapBaseUrl}/JSON/alert/view/alerts/`, {
    params: { apikey: env.zapApiKey, baseurl: targetUrl }
  });

  return alertsResponse.data.alerts.map((alert) => ({
    type: alert.alert.toLowerCase().includes("cross") ? "xss" : alert.alert.toLowerCase().includes("sql") ? "sqli" : "ssl",
    severity: (alert.risk || "low").toLowerCase(),
    technicalDetails: `${alert.name || alert.alert}: ${alert.description || "See ZAP output for details."}`
  }));
};

export const runWebsiteSecurityChecks = async (targetUrl) => {
  const { hostname } = new URL(targetUrl);
  const [ssl, openPorts] = await Promise.all([
    inspectSsl(hostname),
    Promise.all(commonPorts.map((port) => checkPort(hostname, port)))
  ]);

  let rawIssues = [];
  let source = "mock";

  if (!env.useMockScanner) {
    rawIssues = await fetchZapAlerts(targetUrl);
    source = "zap";
  } else {
    rawIssues = buildMockAlerts(targetUrl);
  }

  return {
    source,
    rawIssues,
    ssl,
    openPorts
  };
};
