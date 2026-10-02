import { Module } from "@nestjs/common";
import { PrismaService } from "../../prisma.service";
import { AuthModule } from "../auth/auth.module";
import { FindingsController } from "./findings.controller";
import { FindingsRepository } from "./findings.repository";
import { FindingsService } from "./findings.service";

@Module({
  imports: [AuthModule],
  controllers: [FindingsController],
  providers: [PrismaService, FindingsRepository, FindingsService],
  exports: [FindingsService]
})
export class FindingsModule {}
