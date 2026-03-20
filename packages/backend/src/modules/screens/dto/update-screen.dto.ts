import { PartialType } from '@nestjs/swagger';
import { CreateScreenDto } from './create-screen.dto';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateScreenDto extends PartialType(CreateScreenDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
