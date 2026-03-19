import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { UpsertPlaylistItemsDto } from './dto/upsert-playlist-items.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('playlists')
@ApiBearerAuth()
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  @RequirePermissions('playlists:read')
  findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.playlistsService.findAll(user.organizationId, pagination);
  }

  @Get(':id')
  @RequirePermissions('playlists:read')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.playlistsService.findOne(id, user.organizationId);
  }

  @Post()
  @RequirePermissions('playlists:create')
  create(@Body() dto: CreatePlaylistDto, @CurrentUser() user: User) {
    return this.playlistsService.create(dto, user.organizationId, user.id);
  }

  @Put(':id')
  @RequirePermissions('playlists:update')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlaylistDto,
    @CurrentUser() user: User,
  ) {
    return this.playlistsService.update(id, dto, user.organizationId);
  }

  @Put(':id/items')
  @RequirePermissions('playlists:update')
  @ApiOperation({ summary: 'Replace all items in a playlist' })
  upsertItems(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpsertPlaylistItemsDto,
    @CurrentUser() user: User,
  ) {
    return this.playlistsService.upsertItems(id, dto, user.organizationId, user.id);
  }

  @Delete(':id')
  @RequirePermissions('playlists:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.playlistsService.remove(id, user.organizationId);
  }
}
