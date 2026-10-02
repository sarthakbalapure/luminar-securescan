import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserWorkspaceGuard } from '../auth/user-workspace.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll(@Query() query: ListProjectsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.id, query.organizationId);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }
}
