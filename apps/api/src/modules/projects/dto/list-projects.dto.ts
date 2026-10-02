import { IsOptional, IsUUID } from 'class-validator';

export class ListProjectsDto {
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
