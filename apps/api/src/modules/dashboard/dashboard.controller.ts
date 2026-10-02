import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserWorkspaceGuard } from "../auth/user-workspace.guard";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.summary(user.id);
  }
}
