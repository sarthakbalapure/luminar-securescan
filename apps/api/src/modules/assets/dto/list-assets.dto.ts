import { IsOptional, IsUUID } from 'class-validator';

export class ListAssetsDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
