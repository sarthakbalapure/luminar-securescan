import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserWorkspaceGuard } from '../auth/user-workspace.guard';
import { FindingsService } from './findings.service';
import { ListFindingsDto } from './list-findings.dto';
import { UpdateFindingStatusDto } from './update-finding-status.dto';

@Controller('findings')
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class FindingsController {
  constructor(private readonly service: FindingsService) {}

  @Get()
  findAll(@Query() query: ListFindingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.id, query.scanId, query.assetId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFindingStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.updateStatus(id, user.id, dto.status);
  }
}
