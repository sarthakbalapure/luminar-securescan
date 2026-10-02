import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserWorkspaceGuard } from "../auth/user-workspace.guard";
import { SubscriptionQueryDto } from "./dto";
import { SubscriptionService } from "./subscription.service";

@Controller("subscriptions")
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionService) {}

  @Get("plans")
  plans() {
    return this.subscriptions.plans();
  }

  @Get("current")
  current(@CurrentUser() user: AuthenticatedUser, @Query() query: SubscriptionQueryDto) {
    return this.subscriptions.overviewForUser(user.id, query.organizationId);
  }

  @Get("usage")
  usage(@CurrentUser() user: AuthenticatedUser, @Query() query: SubscriptionQueryDto) {
    return this.subscriptions.overviewForUser(user.id, query.organizationId);
  }
}
