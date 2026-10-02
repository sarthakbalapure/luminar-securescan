import { IsOptional, IsUUID } from 'class-validator';

export class ListScansDto {
  @IsOptional()
  @IsUUID()
  assetId?: string;
}
