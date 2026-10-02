import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserWorkspaceGuard } from '../auth/user-workspace.guard';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { ListAssetsDto } from './dto/list-assets.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  findAll(@Query() query: ListAssetsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.id, query.projectId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
