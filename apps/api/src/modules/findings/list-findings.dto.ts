import { IsOptional, IsUUID } from 'class-validator';

export class ListFindingsDto {
  @IsOptional()
  @IsUUID()
  scanId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;
}
