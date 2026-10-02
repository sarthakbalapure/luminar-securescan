import { FixRequestStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateFixRequestDto {
  @IsUUID()
  findingId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message!: string;
}

export class ReplyFixRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(5000)
  message!: string;
}

export class UpdateFixRequestStatusDto {
  @IsEnum(FixRequestStatus)
  status!: FixRequestStatus;
}

export class AssignFixRequestDto {
  @IsOptional()
  @IsUUID()
  adminUserId?: string;
}
