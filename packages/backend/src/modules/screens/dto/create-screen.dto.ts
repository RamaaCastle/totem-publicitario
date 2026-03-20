import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScreenOrientation, ScreenType } from '../../../database/entities/screen.entity';

export class CreateScreenDto {
  @ApiProperty({ example: 'Reception TV' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Main lobby entrance' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({ example: 'Floor 1, Lobby' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ enum: ScreenOrientation, default: ScreenOrientation.LANDSCAPE })
  @IsOptional()
  @IsEnum(ScreenOrientation)
  orientation?: ScreenOrientation;

  @ApiPropertyOptional({ enum: ScreenType, default: ScreenType.TV })
  @IsOptional()
  @IsEnum(ScreenType)
  screenType?: ScreenType;
}
