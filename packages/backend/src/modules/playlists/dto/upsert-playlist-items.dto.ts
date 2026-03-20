import { IsArray, ValidateNested, IsUUID, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class PlaylistItemDto {
  @ApiProperty()
  @IsUUID()
  mediaFileId: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ description: 'Duration in seconds. null = use playlist default' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertPlaylistItemsDto {
  @ApiProperty({ type: [PlaylistItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaylistItemDto)
  items: PlaylistItemDto[];
}
