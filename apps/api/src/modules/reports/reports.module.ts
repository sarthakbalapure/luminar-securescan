import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { ReportsController } from "./reports.controller";
import { ReportsRepository } from "./reports.repository";
import { ReportsService } from "./reports.service";

@Module({
  imports: [AuthModule, ConfigModule],
  controllers: [ReportsController],
  providers: [PrismaService, ReportsRepository, ReportsService],
  exports: [ReportsService]
})
export class ReportsModule {}
