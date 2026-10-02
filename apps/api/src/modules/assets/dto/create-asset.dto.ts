import { AssetType, RiskLevel, VerificationStatus } from '@prisma/client';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class CreateAssetDto {
  @IsUUID()
  projectId!: string;

  @IsEnum(AssetType)
  type!: AssetType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  url!: string;

  @IsEnum(VerificationStatus)
  verifiedStatus: VerificationStatus = VerificationStatus.UNVERIFIED;

  @IsEnum(RiskLevel)
  riskLevel: RiskLevel = RiskLevel.INFO;

  @IsOptional()
  @IsIn(['PRODUCTION', 'STAGING', 'DEVELOPMENT'])
  environment?: 'PRODUCTION' | 'STAGING' | 'DEVELOPMENT';

  @IsOptional()
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  businessCriticality?: 'HIGH' | 'MEDIUM' | 'LOW';

  @IsOptional()
  @IsString()
  @MaxLength(500000)
  openApiSpecContent?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  openApiSpecUrl?: string;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  baseApiUrl?: string;
}
