import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsRepository } from "../organizations/organizations.repository";
import { ProjectsController } from "./projects.controller";
import { ProjectsRepository } from "./projects.repository";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [PrismaService, OrganizationsRepository, ProjectsRepository, ProjectsService],
  exports: [ProjectsRepository, ProjectsService]
})
export class ProjectsModule {}
