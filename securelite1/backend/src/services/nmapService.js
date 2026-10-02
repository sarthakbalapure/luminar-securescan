import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const commonPorts = [21, 22, 80, 443, 3306, 8080];

export const runPortScan = async ({ hostname, useMockScanner }) => {
  if (useMockScanner) {
    const openPorts = commonPorts
      .filter((port) => [80, 443].includes(port))
      .map((port) => ({ port, status: "open" }));

    return {
      source: "mock",
      openPorts,
      issues: []
    };
  }

  try {
    const { stdout } = await execFileAsync("nmap", ["-Pn", "-p", commonPorts.join(","), hostname], {
      timeout: 15000
    });

    const openPorts = stdout
      .split("\n")
      .filter((line) => line.includes("/tcp") && line.includes("open"))
      .map((line) => ({
        port: Number(line.split("/")[0]),
        status: "open"
      }));

    const issues = openPorts
      .filter((item) => [21, 22, 3306, 8080].includes(item.port))
      .map((item) => ({
        scanner: "nmap",
        type: "port",
        severity: [21, 22, 3306].includes(item.port) ? "medium" : "low",
        technicalDetails: `Nmap detected internet-facing port ${item.port}/tcp as open.`
      }));

    return {
      source: "nmap",
      openPorts,
      issues
    };
  } catch (_error) {
    return {
      source: "mock",
      openPorts: [
        { port: 80, status: "open" },
        { port: 443, status: "open" }
      ],
      issues: [
        {
          scanner: "nmap",
          type: "port",
          severity: "info",
          technicalDetails: "Nmap was unavailable, so SecureLite used a safe fallback result."
        }
      ]
    };
  }
};
