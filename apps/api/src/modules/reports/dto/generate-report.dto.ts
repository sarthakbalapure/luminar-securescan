import { ReportType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";

export class ReportOptionsDto {
  @IsOptional()
  @IsBoolean()
  includeExecutiveSummary?: boolean;

  @IsOptional()
  @IsBoolean()
  includeTechnicalDetails?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRemediation?: boolean;

  @IsOptional()
  @IsBoolean()
  includeEvidence?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAppendix?: boolean;
}

export class GenerateReportDto extends ReportOptionsDto {
  @IsEnum(ReportType)
  reportType: ReportType = ReportType.FULL_SECURITY_AUDIT;
}

export class GenerateReportRequestDto extends GenerateReportDto {
  @IsUUID()
  scanId!: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}
