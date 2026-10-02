import { ScanType } from '@prisma/client';
import { ArrayMaxSize, Equals, IsArray, IsBoolean, IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateScanDto {
  @IsUUID()
  assetId!: string;

  @IsEnum(ScanType)
  scanType!: ScanType;

  @IsOptional()
  @IsUUID()
  createdBy?: string;

  @IsBoolean()
  @Equals(true, { message: 'Authorization confirmation is required before starting a scan.' })
  authorizationConfirmed!: boolean;

  @IsOptional()
  @IsBoolean()
  includePassiveBaselineScan?: boolean;

  @IsOptional()
  @IsIn(['internal', 'owasp_zap', 'nuclei'])
  scanner?: 'internal' | 'owasp_zap' | 'nuclei';

  @IsOptional()
  @IsIn(['baseline', 'zap_baseline', 'zap_full', 'nuclei_safe_baseline', 'nuclei_cve', 'nuclei_full'])
  scanMode?: 'baseline' | 'zap_baseline' | 'zap_full' | 'nuclei_safe_baseline' | 'nuclei_cve' | 'nuclei_full';

  @IsOptional()
  @IsBoolean()
  fullScanConfirmed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  apiBearerToken?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  scanScopePaths?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  repositoryBranch?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  repositoryToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000000)
  repositoryZipBase64?: string;
}
