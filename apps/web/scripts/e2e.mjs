import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 3100;
const url = `http://127.0.0.1:${port}`;

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port)], {
  cwd: process.cwd(),
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000" },
  shell: false,
});

server.stdout.on("data", (chunk) => process.stdout.write(`[web] ${chunk}`));
server.stderr.on("data", (chunk) => process.stderr.write(`[web] ${chunk}`));

try {
  await waitForServer(url);
  const exitCode = await runPlaywright();
  await stopServer();
  process.exit(exitCode);
} catch (error) {
  console.error(error);
  await stopServer();
  process.exit(1);
}

async function waitForServer(target) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 120_000) {
    try {
      const response = await fetch(target);
      if (response.status < 500) return;
    } catch {
      await delay(500);
    }
  }
  throw new Error(`Timed out waiting for ${target}`);
}

function runPlaywright() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test"], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, PLAYWRIGHT_SKIP_WEBSERVER: "1" },
      shell: false,
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server.exitCode !== null || !server.pid) {
      resolve();
      return;
    }
    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      killer.on("exit", () => resolve());
      return;
    }
    server.kill("SIGTERM");
    server.on("exit", () => resolve());
  });
}
