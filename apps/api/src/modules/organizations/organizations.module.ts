import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsRepository } from "./organizations.repository";
import { OrganizationsService } from "./organizations.service";

@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [PrismaService, OrganizationsRepository, OrganizationsService],
  exports: [OrganizationsRepository, OrganizationsService]
})
export class OrganizationsModule {}
