import { FindingStatus } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateFindingStatusDto {
  @IsEnum(FindingStatus)
  status!: FindingStatus;
}
