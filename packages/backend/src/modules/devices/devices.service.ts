import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Screen, ScreenStatus } from '../../database/entities/screen.entity';
import { DeviceToken } from '../../database/entities/device-token.entity';
import { Heartbeat } from '../../database/entities/heartbeat.entity';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    @InjectRepository(DeviceToken) private readonly tokenRepo: Repository<DeviceToken>,
    @InjectRepository(Heartbeat) private readonly heartbeatRepo: Repository<Heartbeat>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Called by player on first boot to pair with the system
  async registerDevice(deviceCode: string, meta?: any): Promise<{ token: string; screen: Screen }> {
    const screen = await this.screenRepo.findOne({
      where: { deviceCode, isActive: true },
    });

    if (!screen) throw new NotFoundException(`Device code ${deviceCode} not found or inactive`);

    // Generate device JWT (long-lived — 1 year, can be revoked)
    const token = await this.jwtService.signAsync(
      { deviceCode, screenId: screen.id, type: 'device' },
      {
        secret: this.configService.get<string>('auth.jwtSecret'),
        expiresIn: '365d',
      },
    );

    // Save token record
    const deviceToken = this.tokenRepo.create({
      token,
      screenId: screen.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });
    await this.tokenRepo.save(deviceToken);

    // Update screen metadata
    await this.screenRepo.update(screen.id, {
      status: ScreenStatus.ONLINE,
      lastSeenAt: new Date(),
      osInfo: meta?.osInfo,
      appVersion: meta?.appVersion,
    });

    return { token, screen };
  }

  private getArgDateKey(): string {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const y = p.find(x => x.type === 'year')?.value ?? '';
    const m = p.find(x => x.type === 'month')?.value ?? '';
    const d = p.find(x => x.type === 'day')?.value ?? '';
    return `${y}-${m}-${d}`;
  }

  // Returns the current playlist config for the player
  async getDeviceConfig(deviceCode: string) {
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

    if (!screen) throw new NotFoundException('Screen not found');

    const now = new Date();
    const currentHour = now.getHours() * 60 + now.getMinutes();
    const currentDay = now.getDay().toString();

    const activeCampaigns = (screen.assignments || [])
      .filter((a) => {
        if (!a.isActive || !a.campaign) return false;
        const c = a.campaign;
        if (c.status !== 'active') return false;
        if (c.startsAt && new Date(c.startsAt) > now) return false;
        if (c.endsAt && new Date(c.endsAt) < now) return false;

        // Check schedule days
        if (c.scheduleDays?.length && !c.scheduleDays.includes(currentDay)) return false;

        // Check schedule time
        if (c.scheduleTimeFrom && c.scheduleTimeTo) {
          const [fH, fM] = c.scheduleTimeFrom.split(':').map(Number);
          const [tH, tM] = c.scheduleTimeTo.split(':').map(Number);
          const from = fH * 60 + fM;
          const to = tH * 60 + tM;
          if (currentHour < from || currentHour > to) return false;
        }

        return true;
      })
      .sort((a, b) => b.campaign.priority - a.campaign.priority);

    // Merge items from ALL active campaigns (sorted by priority desc, then item order)
    const mergedItems: any[] = [];
    for (const assignment of activeCampaigns) {
      const pl = assignment.campaign.playlist;
      if (!pl) continue;
      const activeItems = (pl.items || [])
        .filter((i) => i.isActive)
        .sort((a, b) => a.order - b.order)
        .map((item) => ({
          id: item.id,
          order: item.order,
          durationSeconds: item.durationSeconds || pl.defaultDurationSeconds || 10,
          media: {
            id: item.mediaFile.id,
            type: item.mediaFile.type,
            url: item.mediaFile.publicUrl,
            checksum: item.mediaFile.checksum,
          },
        }));
      mergedItems.push(...activeItems);
    }

    return {
      screen: {
        id: screen.id,
        name: screen.name,
        orientation: screen.orientation,
        screenType: screen.screenType,
        hotelInfo: screen.metadata?.hotelInfo ?? null,
        hotelLogo: screen.metadata?.hotelLogo ?? null,
        schedule: (() => {
          const todayKey = this.getArgDateKey();
          const schedules = screen.metadata?.schedules ?? {};
          // New format: schedules keyed by date
          if (schedules[todayKey]) return schedules[todayKey];
          // Legacy format: flat schedule array
          return screen.metadata?.schedule ?? null;
        })(),
      },
      playlist: mergedItems.length > 0
        ? {
            id: activeCampaigns[0]?.campaign?.playlist?.id ?? 'merged',
            name: 'merged',
            defaultDurationSeconds: 10,
            items: mergedItems,
          }
        : null,
      updatedAt: new Date(),
    };
  }

  async processHeartbeat(
    deviceCode: string,
    data: any,
    ipAddress?: string,
  ): Promise<{ hasUpdate: boolean }> {
    const screen = await this.screenRepo.findOne({ where: { deviceCode } });
    if (!screen) throw new NotFoundException('Screen not found');

    await this.screenRepo.update(screen.id, {
      status: ScreenStatus.ONLINE,
      lastSeenAt: new Date(),
      ipAddress,
      appVersion: data?.appVersion,
      currentPlaylistId: data?.currentPlaylistId,
    });

    const heartbeat = this.heartbeatRepo.create({
      screenId: screen.id,
      ipAddress,
      appVersion: data?.appVersion,
      currentPlaylistId: data?.currentPlaylistId,
      cpuUsage: data?.cpuUsage,
      memoryUsage: data?.memoryUsage,
      extra: data?.extra,
    });
    await this.heartbeatRepo.save(heartbeat).catch(() => {});

    // TODO: compare currentPlaylistId with active assignment to detect updates
    const hasUpdate = false;
    return { hasUpdate };
  }
}
