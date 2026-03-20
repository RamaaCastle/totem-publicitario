import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { Campaign } from '../../database/entities/campaign.entity';
import { CampaignAssignment } from '../../database/entities/campaign-assignment.entity';
import { Screen } from '../../database/entities/screen.entity';
import { ScreenGroup } from '../../database/entities/screen-group.entity';
import { ScreensModule } from '../screens/screens.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, CampaignAssignment, Screen, ScreenGroup]), ScreensModule, AuditModule],
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
