import { PlanCode } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class SubscriptionQueryDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}

export class AssignSubscriptionDto {
  @IsEnum(PlanCode)
  planCode!: PlanCode;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
