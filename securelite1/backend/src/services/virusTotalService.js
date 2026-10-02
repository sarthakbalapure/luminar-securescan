import axios from "axios";
import { URL } from "url";
import { env } from "../config/env.js";

const toUrlId = (targetUrl) => Buffer.from(targetUrl).toString("base64url");

const buildMockMalwareResponse = (targetUrl) => {
  const hostname = new URL(targetUrl).hostname;
  const suspicious = hostname.includes("free") || hostname.includes("download") ? 2 : 0;
  const malicious = hostname.includes("crack") || hostname.includes("phish") ? 3 : 0;
  const riskScore = Math.max(0, 100 - malicious * 22 - suspicious * 10);

  return {
    source: "mock",
    reputation: {
      malicious,
      suspicious,
      harmless: riskScore >= 80 ? 10 : 4,
      undetected: 20,
      timeout: 0
    },
    grade: malicious > 0 ? "Unsafe" : suspicious > 0 ? "Caution" : "Clean",
    riskScore,
    issues: [
      ...(malicious > 0
        ? [
            {
              scanner: "virustotal-mock",
              type: "malware",
              severity: "high",
              technicalDetails: "Mock malware reputation signals indicate the URL would likely be flagged by multiple engines."
            }
          ]
        : []),
      ...(suspicious > 0
        ? [
            {
              scanner: "virustotal-mock",
              type: "reputation",
              severity: "medium",
              technicalDetails: "Mock domain reputation signals suggest caution and additional review."
            }
          ]
        : [])
    ]
  };
};

export const runMalwareScan = async ({ targetUrl }) => {
  if (env.useMockScanner || !env.virusTotalApiKey) {
    return buildMockMalwareResponse(targetUrl);
  }

  try {
    const urlId = toUrlId(targetUrl);
    const response = await axios.get(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: {
        "x-apikey": env.virusTotalApiKey
      },
      timeout: 12000
    });

    const stats = response.data?.data?.attributes?.last_analysis_stats || {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const harmless = stats.harmless || 0;
    const undetected = stats.undetected || 0;
    const riskScore = Math.max(0, 100 - malicious * 22 - suspicious * 10);

    return {
      source: "virustotal",
      reputation: {
        malicious,
        suspicious,
        harmless,
        undetected,
        timeout: stats.timeout || 0
      },
      grade: malicious > 0 ? "Unsafe" : suspicious > 0 ? "Caution" : "Clean",
      riskScore,
      issues: [
        ...(malicious > 0
          ? [
              {
                scanner: "virustotal",
                type: "malware",
                severity: "high",
                technicalDetails: `VirusTotal reported ${malicious} malicious detections for this URL.`
              }
            ]
          : []),
        ...(suspicious > 0
          ? [
              {
                scanner: "virustotal",
                type: "reputation",
                severity: "medium",
                technicalDetails: `VirusTotal reported ${suspicious} suspicious detections for this URL.`
              }
            ]
          : [])
      ]
    };
  } catch (_error) {
    return {
      source: "virustotal-fallback",
      reputation: {
        malicious: 0,
        suspicious: 0,
        harmless: 0,
        undetected: 0,
        timeout: 0
      },
      grade: "Unknown",
      riskScore: 50,
      issues: [
        {
          scanner: "virustotal",
          type: "reputation",
          severity: "info",
          technicalDetails: "VirusTotal could not be reached, so malware reputation could not be confirmed right now."
        }
      ]
    };
  }
};
