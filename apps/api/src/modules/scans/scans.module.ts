import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AssetsRepository } from "../assets/assets.repository";
import { AssetsModule } from "../assets/assets.module";
import { AuthModule } from "../auth/auth.module";
import { ScansController } from "./scans.controller";
import { scanQueueProvider } from "./scan-queue";
import { ScansRepository } from "./scans.repository";
import { ScansService } from "./scans.service";
import { NucleiService } from "./nuclei.service";
import { ZapService } from "./zap.service";
import { SqlmapService } from "./sqlmap.service";

@Module({
  imports: [AssetsModule, AuthModule],
  controllers: [ScansController],
  providers: [PrismaService, AssetsRepository, ScansRepository, ScansService, ZapService, NucleiService, SqlmapService, scanQueueProvider],
  exports: [ScansService]
})
export class ScansModule {}
