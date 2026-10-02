import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AdminService } from "./admin.service";
import { DisableOrganizationDto } from "./dto";
import { AssignSubscriptionDto } from "../subscriptions/dto";
import { PlatformAdminGuard } from "./platform-admin.guard";

@Controller("admin")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.summary(user.id);
  }

  @Get("organizations")
  organizations(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.organizations(user.id);
  }

  @Get("organizations/:id")
  organizationDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.organizationDetail(id);
  }

  @Post("organizations/:id/disable")
  disableOrganization(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DisableOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.disableOrganization(id, dto, user.id);
  }

  @Get("users")
  users(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.users(user.id);
  }

  @Get("users/:id")
  userDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.admin.userDetail(id);
  }

  @Get("scans")
  scans(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.scans(user.id);
  }

  @Post("scans/:id/retry")
  retryFailedScan(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.admin.retryFailedScan(id, user.id);
  }

  @Get("findings")
  findings() {
    return this.admin.findings();
  }

  @Get("reports")
  reports() {
    return this.admin.reports();
  }

  @Get("audit-logs")
  auditLogs(@CurrentUser() user: AuthenticatedUser) {
    return this.admin.auditLogs(user.id);
  }

  @Get("system-health")
  systemHealth() {
    return this.admin.systemHealth();
  }

  @Get("subscriptions")
  subscriptions() {
    return this.admin.subscriptions();
  }

  @Patch("subscriptions/:organizationId")
  changeSubscription(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.changeSubscription(organizationId, dto, user.id);
  }

  @Patch("organizations/:organizationId/subscription")
  assignOrganizationSubscription(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: AssignSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.changeSubscription(organizationId, dto, user.id);
  }

  @Post("organizations/:organizationId/subscription/usage/reset")
  resetSubscriptionUsage(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.admin.resetSubscriptionUsage(organizationId, user.id);
  }

  @Get("usage-report")
  @Header("Content-Disposition", 'attachment; filename="luminar-admin-usage-report.json"')
  usageReport() {
    return this.admin.usageReport();
  }
}
