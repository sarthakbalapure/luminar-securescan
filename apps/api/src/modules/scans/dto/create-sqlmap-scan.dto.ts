import { Equals, IsBoolean, IsIn, IsOptional, IsString, IsUUID, IsUrl, Matches, MaxLength } from 'class-validator';

export class CreateSqlmapScanDto {
  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsIn(['sqlmap'])
  scanner?: 'sqlmap';

  @IsOptional()
  @IsIn(['sqlmap_detection'])
  scanMode?: 'sqlmap_detection';

  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(2048)
  targetUrl!: string;

  @IsIn(['GET', 'POST'])
  method!: 'GET' | 'POST';

  @IsString()
  @Matches(/^[A-Za-z0-9_.\-[\]]{1,120}$/, { message: 'Parameter name contains unsupported characters.' })
  parameter!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  postBody?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  authorizationHeader?: string;

  @IsBoolean()
  @Equals(true, { message: 'Authorization confirmation is required before starting a scan.' })
  authorizationConfirmed!: boolean;

  @IsBoolean()
  @Equals(true, { message: 'SQL injection test confirmation is required before starting this scan.' })
  sqlInjectionTestConfirmed!: boolean;
}
