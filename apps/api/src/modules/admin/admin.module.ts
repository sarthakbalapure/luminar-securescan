import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { scanQueueProvider } from "../scans/scan-queue";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { PlatformAdminGuard } from "./platform-admin.guard";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [PrismaService, AdminService, PlatformAdminGuard, scanQueueProvider],
})
export class AdminModule {}
