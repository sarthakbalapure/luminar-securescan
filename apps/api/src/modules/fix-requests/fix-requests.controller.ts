import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../admin/platform-admin.guard";
import { CurrentUser, type AuthenticatedUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UserWorkspaceGuard } from "../auth/user-workspace.guard";
import { AssignFixRequestDto, CreateFixRequestDto, ReplyFixRequestDto, UpdateFixRequestStatusDto } from "./dto";
import { FixRequestsService } from "./fix-requests.service";

@Controller("fix-requests")
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class FixRequestsController {
  constructor(private readonly requests: FixRequestsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFixRequestDto) {
    return this.requests.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.requests.findAllForUser(user.id);
  }

  @Get(":id")
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.requests.findByIdForUser(id, user.id);
  }

  @Post(":id/reply")
  reply(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReplyFixRequestDto) {
    return this.requests.customerReply(id, user.id, dto);
  }
}

@Controller("admin/fix-requests")
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminFixRequestsController {
  constructor(private readonly requests: FixRequestsService) {}

  @Get()
  findAll() {
    return this.requests.findAllForAdmin();
  }

  @Get(":id")
  findById(@Param("id", ParseUUIDPipe) id: string) {
    return this.requests.findByIdForAdmin(id);
  }

  @Patch(":id/status")
  updateStatus(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateFixRequestStatusDto) {
    return this.requests.updateStatus(id, user.id, dto);
  }

  @Patch(":id/assign")
  assign(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: AssignFixRequestDto) {
    return this.requests.assign(id, user.id, dto);
  }

  @Post(":id/respond")
  respond(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: ReplyFixRequestDto) {
    return this.requests.respond(id, user.id, dto);
  }
}
