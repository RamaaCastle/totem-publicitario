import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Playlist } from '../../database/entities/playlist.entity';
import { PlaylistItem } from '../../database/entities/playlist-item.entity';
import { MediaFile } from '../../database/entities/media-file.entity';
import { Screen } from '../../database/entities/screen.entity';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { UpsertPlaylistItemsDto } from './dto/upsert-playlist-items.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ScreensGateway } from '../../gateways/screens.gateway';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../../database/entities/audit-log.entity';

const AUTO_PREFIX = '__auto__';
const GLOBAL_NAME = '__global__';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectRepository(Playlist) private readonly playlistRepo: Repository<Playlist>,
    @InjectRepository(PlaylistItem) private readonly itemRepo: Repository<PlaylistItem>,
    @InjectRepository(MediaFile) private readonly mediaRepo: Repository<MediaFile>,
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    private readonly screensGateway: ScreensGateway,
    private readonly auditService: AuditService,
  ) {}

  async findAll(organizationId: string, pagination: PaginationDto) {
    const [items, total] = await this.playlistRepo.findAndCount({
      where: { organizationId },
      relations: ['items', 'items.mediaFile'],
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    });
    return { items, total };
  }

  async findOne(id: string, organizationId: string): Promise<Playlist> {
    const playlist = await this.playlistRepo.findOne({
      where: { id, organizationId },
      relations: ['items', 'items.mediaFile', 'createdBy'],
    });
    if (!playlist) throw new NotFoundException(`Playlist ${id} not found`);
    return playlist;
  }

  async create(dto: CreatePlaylistDto, organizationId: string, userId: string): Promise<Playlist> {
    const playlist = this.playlistRepo.create({
      ...dto,
      organizationId,
      createdById: userId,
    });
    return this.playlistRepo.save(playlist);
  }

  async update(id: string, dto: UpdatePlaylistDto, organizationId: string): Promise<Playlist> {
    const playlist = await this.findOne(id, organizationId);
    Object.assign(playlist, dto);
    return this.playlistRepo.save(playlist);
  }

  async upsertItems(
    id: string,
    dto: UpsertPlaylistItemsDto,
    organizationId: string,
    userId?: string,
  ): Promise<Playlist> {
    const playlist = await this.findOne(id, organizationId);

    // Delete existing items
    await this.itemRepo.delete({ playlistId: id });

    // Validate all media files belong to org
    const mediaIds = dto.items.map((i) => i.mediaFileId);
    const mediaFiles = await this.mediaRepo.findByIds(mediaIds);
    const validMediaMap = new Map(
      mediaFiles.filter((m) => m.organizationId === organizationId).map((m) => [m.id, m]),
    );

    // Create new items
    const items = dto.items
      .filter((i) => validMediaMap.has(i.mediaFileId))
      .map((i, index) =>
        this.itemRepo.create({
          playlistId: id,
          mediaFileId: i.mediaFileId,
          order: i.order ?? index,
          durationSeconds: i.durationSeconds,
          isActive: i.isActive ?? true,
        }),
      );

    await this.itemRepo.save(items);

    // Audit log
    if (userId) {
      let context: 'screen' | 'global' | 'other' = 'other';
      let screenName: string | undefined;

      if (playlist.name === GLOBAL_NAME) {
        context = 'global';
      } else if (playlist.name.startsWith(AUTO_PREFIX)) {
        context = 'screen';
        const screenId = playlist.name.slice(AUTO_PREFIX.length);
        const screen = await this.screenRepo.findOne({ where: { id: screenId } });
        screenName = screen?.name;
      }

      const itemsList = dto.items
        .slice(0, 15)
        .map((i) => {
          const mf = validMediaMap.get(i.mediaFileId);
          return mf ? { name: mf.originalName, type: mf.type } : null;
        })
        .filter(Boolean);

      this.auditService.log({
        action: AuditAction.PLAYLIST_UPDATED,
        userId,
        organizationId,
        targetId: id,
        targetType: 'Playlist',
        meta: { context, screenName, playlistName: playlist.name, itemCount: items.length, items: itemsList },
      });
    }

    // Notify all connected players in this org to re-fetch their config
    this.screensGateway.pushOrgPlaylistUpdate(organizationId).catch(() => {});

    return this.findOne(id, organizationId);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const playlist = await this.findOne(id, organizationId);
    await this.playlistRepo.remove(playlist);
  }
}
