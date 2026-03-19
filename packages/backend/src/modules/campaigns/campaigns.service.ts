import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Campaign, CampaignStatus } from '../../database/entities/campaign.entity';
import { CampaignAssignment } from '../../database/entities/campaign-assignment.entity';
import { Screen } from '../../database/entities/screen.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AssignCampaignDto } from './dto/assign-campaign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ScreensGateway } from '../../gateways/screens.gateway';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../database/entities/audit-log.entity';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign) private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignAssignment) private readonly assignmentRepo: Repository<CampaignAssignment>,
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    private readonly screensGateway: ScreensGateway,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, pagination: PaginationDto) {
    const [items, total] = await this.campaignRepo.findAndCount({
      where: { organizationId },
      relations: ['playlist', 'assignments'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return { items, total };
  }

  async findOne(id: string, organizationId: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id, organizationId },
      relations: ['playlist', 'playlist.items', 'playlist.items.mediaFile', 'assignments', 'assignments.screen'],
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async create(dto: CreateCampaignDto, organizationId: string, userId: string): Promise<Campaign> {
    const campaign = this.campaignRepo.create({
      ...dto,
      organizationId,
      createdById: userId,
    });
    return this.campaignRepo.save(campaign);
  }

  async update(id: string, dto: UpdateCampaignDto, organizationId: string): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);
    Object.assign(campaign, dto);
    return this.campaignRepo.save(campaign);
  }

  async updateStatus(id: string, status: CampaignStatus, organizationId: string): Promise<Campaign> {
    const campaign = await this.findOne(id, organizationId);
    campaign.status = status;
    return this.campaignRepo.save(campaign);
  }

  async assign(id: string, dto: AssignCampaignDto, organizationId: string, userId?: string): Promise<CampaignAssignment[]> {
    const campaign = await this.findOne(id, organizationId);

    const assignments: CampaignAssignment[] = [];
    const assignedScreenNames: string[] = [];

    for (const screenId of dto.screenIds || []) {
      const screen = await this.screenRepo.findOne({ where: { id: screenId, organizationId } });
      if (!screen) continue;

      // Remove existing assignment for this screen/campaign pair
      await this.assignmentRepo.delete({ campaignId: id, screenId });

      const assignment = this.assignmentRepo.create({ campaignId: id, screenId });
      assignments.push(await this.assignmentRepo.save(assignment));
      assignedScreenNames.push(screen.name);
    }

    for (const screenGroupId of dto.screenGroupIds || []) {
      await this.assignmentRepo.delete({ campaignId: id, screenGroupId });
      const assignment = this.assignmentRepo.create({ campaignId: id, screenGroupId });
      assignments.push(await this.assignmentRepo.save(assignment));
    }

    // Audit log
    if (userId && assignedScreenNames.length > 0) {
      this.auditService.log({
        action: AuditAction.CAMPAIGN_ASSIGNED,
        userId,
        organizationId,
        targetId: id,
        targetType: 'Campaign',
        meta: {
          campaignName: campaign.name,
          screenNames: assignedScreenNames,
          screenCount: assignedScreenNames.length,
        },
      });
    }

    // Notify assigned screens to re-fetch config immediately
    for (const screenId of dto.screenIds || []) {
      const screen = await this.screenRepo.findOne({ where: { id: screenId } });
      if (screen) {
        this.screensGateway.pushPlaylistUpdate(screenId, screen.organizationId).catch(() => {});
      }
    }

    return assignments;
  }

  async unassign(id: string, screenId: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId); // validates ownership
    await this.assignmentRepo.delete({ campaignId: id, screenId });
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const campaign = await this.findOne(id, organizationId);
    await this.campaignRepo.remove(campaign);
  }
}
