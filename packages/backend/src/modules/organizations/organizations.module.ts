import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { Organization } from '../../database/entities/organization.entity';
import { Screen } from '../../database/entities/screen.entity';
import { MediaFile } from '../../database/entities/media-file.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Organization, Screen, MediaFile])],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
