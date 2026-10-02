import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { PlatformAdminGuard } from "../admin/platform-admin.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminFixRequestsController, FixRequestsController } from "./fix-requests.controller";
import { FixRequestsService } from "./fix-requests.service";

@Module({
  imports: [AuthModule],
  controllers: [FixRequestsController, AdminFixRequestsController],
  providers: [PrismaService, FixRequestsService, PlatformAdminGuard],
})
export class FixRequestsModule {}
