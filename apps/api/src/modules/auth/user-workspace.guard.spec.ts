import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "./current-user.decorator";
import { UserWorkspaceGuard } from "./user-workspace.guard";

const user: AuthenticatedUser = { id: "user-id", name: "User", email: "user@example.com", role: "USER" };

describe("UserWorkspaceGuard", () => {
  it("allows normal user workspace access", () => {
    expect(new UserWorkspaceGuard().canActivate(contextFor(user))).toBe(true);
  });

  it("blocks admin accounts from customer workspace APIs", () => {
    expect(() => new UserWorkspaceGuard().canActivate(contextFor({ ...user, role: "ADMIN" }))).toThrow(ForbiddenException);
  });
});

function contextFor(nextUser?: AuthenticatedUser) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: nextUser }),
    }),
  } as never;
}
