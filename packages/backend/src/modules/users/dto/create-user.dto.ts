import {
  IsEmail, IsString, MinLength, MaxLength, IsOptional,
  IsArray, IsUUID, IsEnum, IsBoolean,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { UserStatus } from '../../../database/entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'john@company.com' })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ type: [String], description: 'Role UUIDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Organization UUID (super admin only)' })
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Grant super admin access (cross-org)' })
  @IsOptional()
  @IsBoolean()
  isSuperAdmin?: boolean;
}
