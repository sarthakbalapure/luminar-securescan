import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("rounded", false && "hidden", "border")).toBe("rounded border");
  });

  it("resolves conflicting tailwind classes", () => {
    expect(cn("text-white", "text-ink")).toBe("text-ink");
    expect(cn("bg-ink", "bg-white")).toBe("bg-white");
  });
});
