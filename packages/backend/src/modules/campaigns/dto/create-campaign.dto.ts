import {
  IsString, IsOptional, IsEnum, IsInt, IsUUID,
  IsDateString, IsArray, Matches, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignStatus } from '../../../database/entities/campaign.entity';

export class CreateCampaignDto {
  @ApiProperty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CampaignStatus, default: CampaignStatus.DRAFT })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ default: 5, description: 'Priority 1-10, higher = shown first' })
  @IsOptional()
  @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  playlistId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @ApiPropertyOptional({ type: [String], example: ['0', '1', '2', '3', '4'] })
  @IsOptional()
  @IsArray()
  scheduleDays?: string[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  scheduleTimeFrom?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  scheduleTimeTo?: string;
}
