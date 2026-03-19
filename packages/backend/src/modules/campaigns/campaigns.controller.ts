import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { AssignCampaignDto } from './dto/assign-campaign.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { CampaignStatus } from '../../database/entities/campaign.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('campaigns')
@ApiBearerAuth()
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @RequirePermissions('campaigns:read')
  findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.campaignsService.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  @RequirePermissions('campaigns:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.campaignsService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('campaigns:create')
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User) {
    return this.campaignsService.create(dto, user.organizationId, user.id);
  }

  @Put(':id')
  @RequirePermissions('campaigns:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.update(id, dto, user.organizationId);
  }

  @Patch(':id/status')
  @RequirePermissions('campaigns:update')
  @ApiOperation({ summary: 'Activate, pause or archive campaign' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: CampaignStatus,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.updateStatus(id, status, user.organizationId);
  }

  @Post(':id/assign')
  @RequirePermissions('campaigns:update')
  @ApiOperation({ summary: 'Assign campaign to screens or groups' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignCampaignDto,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.assign(id, dto, user.organizationId, user.id);
  }

  @Delete(':id/assign/:screenId')
  @RequirePermissions('campaigns:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  unassign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('screenId', ParseUUIDPipe) screenId: string,
    @CurrentUser() user: User,
  ) {
    return this.campaignsService.unassign(id, screenId, user.organizationId);
  }

  @Delete(':id')
  @RequirePermissions('campaigns:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.campaignsService.remove(id, user.organizationId);
  }
}
