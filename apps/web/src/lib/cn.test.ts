import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("rounded", false && "hidden", "border")).toBe("rounded border");
  });
});
