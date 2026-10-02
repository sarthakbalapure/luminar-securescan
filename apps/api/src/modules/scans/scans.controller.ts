import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserWorkspaceGuard } from '../auth/user-workspace.guard';
import { CreateScanDto } from './dto/create-scan.dto';
import { CreateSqlmapScanDto } from './dto/create-sqlmap-scan.dto';
import { ListScansDto } from './dto/list-scans.dto';
import { ScansService } from './scans.service';
import { NucleiService } from './nuclei.service';
import { SqlmapService } from './sqlmap.service';
import { ZapService } from './zap.service';

@Controller('scans')
@UseGuards(JwtAuthGuard, UserWorkspaceGuard)
export class ScansController {
  constructor(private readonly service: ScansService, private readonly zap: ZapService, private readonly nuclei: NucleiService, private readonly sqlmap: SqlmapService) {}

  @Get()
  findAll(@Query() query: ListScansDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.id, query.assetId);
  }

  @Get('zap/health')
  zapHealth() {
    return this.zap.checkZapHealth();
  }

  @Get('nuclei/health')
  nucleiHealth() {
    return this.nuclei.checkNucleiAvailability();
  }

  @Get('sqlmap/health')
  sqlmapHealth() {
    return this.sqlmap.checkSqlmapAvailability();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findById(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user.id);
  }

  @Post('sqlmap')
  createSqlmapScan(@Body() dto: CreateSqlmapScanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createSqlmapScan(dto, user.id);
  }
}
