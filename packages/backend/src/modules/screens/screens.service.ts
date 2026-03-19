import {
  Injectable, NotFoundException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Screen, ScreenStatus } from '../../database/entities/screen.entity';
import { ScreenGroup } from '../../database/entities/screen-group.entity';
import { CreateScreenDto } from './dto/create-screen.dto';
import { UpdateScreenDto } from './dto/update-screen.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ScreensService {
  constructor(
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    @InjectRepository(ScreenGroup) private readonly groupRepo: Repository<ScreenGroup>,
  ) {}

  async findAll(
    organizationId: string,
    pagination: PaginationDto,
  ): Promise<{ items: Screen[]; total: number }> {
    const qb = this.screenRepo.createQueryBuilder('screen')
      .leftJoinAndSelect('screen.groups', 'groups')
      .where('screen.organizationId = :organizationId', { organizationId })
      .orderBy('screen.createdAt', 'DESC')
      .take(pagination.limit)
      .skip((pagination.page - 1) * pagination.limit);

    if (pagination.search) {
      qb.andWhere('(screen.name LIKE :search OR screen.location LIKE :search)', {
        search: `%${pagination.search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string, organizationId: string): Promise<Screen> {
    const screen = await this.screenRepo.findOne({
      where: { id, organizationId },
      relations: ['groups', 'assignments', 'assignments.campaign', 'organization'],
    });
    if (!screen) throw new NotFoundException(`Screen ${id} not found`);
    return screen;
  }

  async findByDeviceCode(deviceCode: string): Promise<Screen> {
    const screen = await this.screenRepo.findOne({
      where: { deviceCode },
      relations: ['organization', 'assignments', 'assignments.campaign', 'assignments.campaign.playlist'],
    });
    if (!screen) throw new NotFoundException(`Device ${deviceCode} not registered`);
    return screen;
  }

  async create(dto: CreateScreenDto, organizationId: string): Promise<Screen> {
    // Generate unique device code
    const deviceCode = await this.generateUniqueDeviceCode();

    const screen = this.screenRepo.create({
      ...dto,
      deviceCode,
      organizationId,
    });

    return this.screenRepo.save(screen);
  }

  async update(id: string, dto: UpdateScreenDto, organizationId: string): Promise<Screen> {
    const screen = await this.findOne(id, organizationId);
    Object.assign(screen, dto);
    return this.screenRepo.save(screen);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const screen = await this.findOne(id, organizationId);
    await this.screenRepo.remove(screen);
  }

  async updateSchedule(id: string, date: string, items: any[], organizationId: string): Promise<Screen> {
    const screen = await this.findOne(id, organizationId);
    const schedules = { ...(screen.metadata?.schedules ?? {}) };
    schedules[date] = items;
    screen.metadata = { ...(screen.metadata ?? {}), schedules };
    return this.screenRepo.save(screen);
  }

  async updateActivities(id: string, activities: any[], organizationId: string): Promise<Screen> {
    const screen = await this.findOne(id, organizationId);
    screen.metadata = { ...(screen.metadata ?? {}), activities };
    return this.screenRepo.save(screen);
  }

  async updateHeartbeat(
    deviceCode: string,
    data: { ipAddress?: string; appVersion?: string; currentPlaylistId?: string },
  ): Promise<Screen> {
    const screen = await this.screenRepo.findOne({ where: { deviceCode } });
    if (!screen) throw new NotFoundException('Screen not found');

    await this.screenRepo.update(screen.id, {
      status: ScreenStatus.ONLINE,
      lastSeenAt: new Date(),
      ipAddress: data.ipAddress,
      appVersion: data.appVersion,
      currentPlaylistId: data.currentPlaylistId,
    });

    return this.screenRepo.findOne({ where: { id: screen.id } }) as Promise<Screen>;
  }

  async markOffline(screenId: string): Promise<void> {
    await this.screenRepo.update(screenId, { status: ScreenStatus.OFFLINE });
  }

  async getScreenPlaylist(deviceCode: string) {
    const screen = await this.screenRepo.findOne({
      where: { deviceCode, isActive: true },
      relations: [
        'assignments',
        'assignments.campaign',
        'assignments.campaign.playlist',
        'assignments.campaign.playlist.items',
        'assignments.campaign.playlist.items.mediaFile',
      ],
    });

    if (!screen) throw new NotFoundException('Screen not found or inactive');

    const now = new Date();
    const activeAssignments = screen.assignments.filter((a) => {
      if (!a.isActive || !a.campaign) return false;
      const { campaign } = a;
      if (campaign.status !== 'active') return false;
      if (campaign.startsAt && campaign.startsAt > now) return false;
      if (campaign.endsAt && campaign.endsAt < now) return false;
      return true;
    });

    // Sort by priority, return highest priority campaign's playlist
    activeAssignments.sort((a, b) => b.campaign.priority - a.campaign.priority);

    return {
      screen: { id: screen.id, name: screen.name, orientation: screen.orientation },
      campaigns: activeAssignments.map((a) => ({
        id: a.campaign.id,
        name: a.campaign.name,
        priority: a.campaign.priority,
        playlist: a.campaign.playlist,
      })),
    };
  }

  private async generateUniqueDeviceCode(): Promise<string> {
    let code: string;
    let exists: boolean;
    do {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      exists = !!(await this.screenRepo.findOne({ where: { deviceCode: code } }));
    } while (exists);
    return code;
  }
}
