import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class DisableOrganizationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ChangeSubscriptionDto {
  @IsString()
  @MaxLength(80)
  planName!: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  scanLimit!: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  assetLimit!: number;
}

