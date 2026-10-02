import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AuthModule],
  controllers: [DashboardController],
  providers: [PrismaService, DashboardService],
})
export class DashboardModule {}
