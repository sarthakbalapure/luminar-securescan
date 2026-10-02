import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { ProjectsRepository } from "../projects/projects.repository";
import { AssetsController } from "./assets.controller";
import { AssetsRepository } from "./assets.repository";
import { AssetsService } from "./assets.service";

@Module({
  imports: [AuthModule],
  controllers: [AssetsController],
  providers: [PrismaService, ProjectsRepository, AssetsRepository, AssetsService],
  exports: [AssetsRepository, AssetsService]
})
export class AssetsModule {}
