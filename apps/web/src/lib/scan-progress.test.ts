import { describe, expect, it } from "vitest";
import { formatScanElapsed, isTerminalScanStatus } from "./scan-progress";

describe("scan progress helpers", () => {
  it("recognizes all terminal scan statuses", () => {
    expect(isTerminalScanStatus("COMPLETED")).toBe(true);
    expect(isTerminalScanStatus("FAILED")).toBe(true);
    expect(isTerminalScanStatus("CANCELLED")).toBe(true);
    expect(isTerminalScanStatus("RUNNING")).toBe(false);
  });

  it("freezes elapsed time at the completion timestamp", () => {
    expect(formatScanElapsed(
      "2026-09-22T10:00:00.000Z",
      "2026-09-22T10:01:15.000Z",
      Date.parse("2026-09-22T12:00:00.000Z"),
    )).toBe("1m 15s");
  });

  it("uses the current time while a scan is active", () => {
    expect(formatScanElapsed(
      "2026-09-22T10:00:00.000Z",
      null,
      Date.parse("2026-09-22T10:00:08.000Z"),
    )).toBe("8s");
  });
});
