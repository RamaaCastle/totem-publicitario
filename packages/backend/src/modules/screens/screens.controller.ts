import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { ScreensService } from './screens.service';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ScreensGateway } from '../../gateways/screens.gateway';

@ApiTags('screens')
@ApiBearerAuth()
@Controller('screens')
export class ScreensController {
  constructor(
    private readonly screensService: ScreensService,
    private readonly screensGateway: ScreensGateway,
  ) {}

  @Get()
  @RequirePermissions('screens:read')
  @ApiOperation({ summary: 'List all screens' })
  findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.screensService.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  @RequirePermissions('screens:read')
  @ApiOperation({ summary: 'Get screen by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.screensService.findOne(id, user.organizationId);
  }

  @Get(':id/playlist')
  @RequirePermissions('screens:read')
  @ApiOperation({ summary: 'Get active playlist for screen' })
  getPlaylist(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.screensService.getScreenPlaylist(id);
  }

  @Post()
  @RequirePermissions('screens:create')
  @ApiOperation({ summary: 'Register new screen' })
  create(@Body() dto: CreateScreenDto, @CurrentUser() user: User) {
    return this.screensService.create(dto, user.organizationId);
  }

  @Put(':id')
  @RequirePermissions('screens:update')
  @ApiOperation({ summary: 'Update screen' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScreenDto,
    @CurrentUser() user: User,
  ) {
    return this.screensService.update(id, dto, user.organizationId);
  }

  @Put(':id/schedule')
  @RequirePermissions('screens:update')
  @ApiOperation({ summary: 'Update totem activity schedule for a specific date' })
  async updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('date') date: string,
    @Body('schedule') schedule: any[],
    @CurrentUser() user: User,
  ) {
    const screen = await this.screensService.updateSchedule(id, date, schedule ?? [], user.organizationId);
    await this.screensGateway.pushPlaylistUpdate(screen.id, screen.organizationId).catch(() => {});
    return screen;
  }

  @Post(':id/regenerate-code')
  @RequirePermissions('screens:update')
  @ApiOperation({ summary: 'Regenerate device pairing code' })
  regenerateCode(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.screensService.regenerateDeviceCode(id, user.organizationId);
  }

  @Put(':id/activities')
  @RequirePermissions('screens:update')
  @ApiOperation({ summary: 'Update activity catalog for totem screen' })
  async updateActivities(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('activities') activities: any[],
    @CurrentUser() user: User,
  ) {
    return this.screensService.updateActivities(id, activities ?? [], user.organizationId);
  }

  @Put(':id/hotel-info')
  @RequirePermissions('screens:update')
  @ApiOperation({ summary: 'Update hotel info items for TV screen' })
  async updateHotelInfo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('hotelInfo') hotelInfo: any[],
    @CurrentUser() user: User,
  ) {
    const screen = await this.screensService.updateHotelInfo(id, hotelInfo ?? [], user.organizationId);
    await this.screensGateway.pushPlaylistUpdate(screen.id, screen.organizationId).catch(() => {});
    return screen;
  }

  @Delete(':id')
  @RequirePermissions('screens:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete screen' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const screen = await this.screensService.findOne(id, user.organizationId);
    // Notify the player to unpair before deleting
    await this.screensGateway.sendCommand(screen.id, 'unpair').catch(() => {});
    return this.screensService.remove(id, user.organizationId);
  }
}
