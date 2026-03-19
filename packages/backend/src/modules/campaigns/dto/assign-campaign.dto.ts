import { IsArray, IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignCampaignDto {
  @ApiPropertyOptional({ type: [String], description: 'Screen IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  screenIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Screen group IDs to assign' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  screenGroupIds?: string[];
}
