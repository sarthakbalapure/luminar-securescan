import { describe, expect, it } from "vitest";
import { calculateSecurityScore, getTemplate, registerAssetSchema, riskRatingForScore, startScanSchema } from "./index";

describe("shared contracts", () => {
  it("requires explicit authorization for asset registration", () => {
    const parsed = registerAssetSchema.safeParse({
      projectId: "00000000-0000-4000-8000-000000000000",
      type: "Website",
      name: "Example",
      url: "https://example.com",
      authorizationConfirmed: false
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one scan check", () => {
    const parsed = startScanSchema.safeParse({
      assetId: "00000000-0000-4000-8000-000000000000",
      authorizationConfirmed: true,
      checks: []
    });

    expect(parsed.success).toBe(false);
  });

  it("returns a safe fallback template for future rules", () => {
    expect(getTemplate("FUTURE_RULE").defaultSeverity).toBe("Info");
  });

  it("calculates security score and risk rating from severity counts", () => {
    const score = calculateSecurityScore({ CRITICAL: 1, HIGH: 1, MEDIUM: 2, LOW: 1 });
    expect(score).toBe(49);
    expect(riskRatingForScore(92)).toBe("Excellent");
    expect(riskRatingForScore(62)).toBe("Moderate");
    expect(riskRatingForScore(score)).toBe("Poor");
  });
});
