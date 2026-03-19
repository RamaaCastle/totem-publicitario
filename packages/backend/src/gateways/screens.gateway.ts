import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
  MessageBody, ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Screen, ScreenStatus } from '../database/entities/screen.entity';
import { Heartbeat } from '../database/entities/heartbeat.entity';

interface DeviceSocket extends Socket {
  deviceCode?: string;
  screenId?: string;
  organizationId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/screens',
  transports: ['websocket', 'polling'],
})
export class ScreensGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScreensGateway.name);

  // Map deviceCode -> socket.id for fast lookups
  private connectedDevices = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(Screen) private readonly screenRepo: Repository<Screen>,
    @InjectRepository(Heartbeat) private readonly heartbeatRepo: Repository<Heartbeat>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Screens WebSocket Gateway initialized');
  }

  async handleConnection(client: DeviceSocket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization;

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Validate device token (different from user JWT)
      const deviceCode = await this.validateDeviceToken(token);
      if (!deviceCode) {
        client.disconnect();
        return;
      }

      const screen = await this.screenRepo.findOne({
        where: { deviceCode },
        relations: ['organization'],
      });

      if (!screen || !screen.isActive) {
        client.disconnect();
        return;
      }

      client.deviceCode = deviceCode;
      client.screenId = screen.id;
      client.organizationId = screen.organizationId;

      // Join organization room and screen room
      client.join(`org:${screen.organizationId}`);
      client.join(`screen:${screen.id}`);

      this.connectedDevices.set(deviceCode, client.id);

      // Mark as online
      await this.screenRepo.update(screen.id, {
        status: ScreenStatus.ONLINE,
        lastSeenAt: new Date(),
        ipAddress: client.handshake.address,
      });

      // Notify admin panel
      this.server.to(`org:${screen.organizationId}`).emit('screen:connected', {
        screenId: screen.id,
        name: screen.name,
        connectedAt: new Date(),
      });

      this.logger.log(`Device ${deviceCode} connected (screen: ${screen.name})`);

      // Send current config to device
      client.emit('config:sync', { screenId: screen.id });

    } catch (err) {
      this.logger.error(`Connection error: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: DeviceSocket) {
    if (!client.screenId) return;

    if (client.deviceCode) this.connectedDevices.delete(client.deviceCode);

    await this.screenRepo.update(client.screenId, {
      status: ScreenStatus.OFFLINE,
    });

    this.server.to(`org:${client.organizationId}`).emit('screen:disconnected', {
      screenId: client.screenId,
      disconnectedAt: new Date(),
    });

    this.logger.log(`Device ${client.deviceCode} disconnected`);
  }

  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: DeviceSocket,
    @MessageBody() data: any,
  ) {
    if (!client.screenId) return;

    await this.screenRepo.update(client.screenId, {
      status: ScreenStatus.ONLINE,
      lastSeenAt: new Date(),
      currentPlaylistId: data?.currentPlaylistId,
      appVersion: data?.appVersion,
    });

    // Save heartbeat record
    const heartbeat = this.heartbeatRepo.create({
      screenId: client.screenId,
      ipAddress: client.handshake.address,
      appVersion: data?.appVersion,
      currentPlaylistId: data?.currentPlaylistId,
      cpuUsage: data?.cpuUsage,
      memoryUsage: data?.memoryUsage,
    });
    await this.heartbeatRepo.save(heartbeat).catch(() => {});

    // Notify admin of heartbeat
    this.server.to(`org:${client.organizationId}`).emit('screen:heartbeat', {
      screenId: client.screenId,
      timestamp: new Date(),
      data,
    });

    return { ack: true, timestamp: new Date() };
  }

  // Called by CampaignsService when a playlist is updated for a screen
  async pushPlaylistUpdate(screenId: string, organizationId: string) {
    this.server.to(`screen:${screenId}`).emit('playlist:updated', {
      screenId,
      timestamp: new Date(),
    });

    this.server.to(`org:${organizationId}`).emit('screen:playlist_updated', {
      screenId,
      timestamp: new Date(),
    });

    this.logger.log(`Pushed playlist update to screen ${screenId}`);
  }

  // Push update to ALL screens in an organization
  async pushOrgPlaylistUpdate(organizationId: string) {
    this.server.to(`org:${organizationId}`).emit('playlist:updated', {
      timestamp: new Date(),
    });
  }

  // Push arbitrary command to a screen
  async sendCommand(screenId: string, command: string, payload?: any) {
    this.server.to(`screen:${screenId}`).emit('command', { command, payload });
  }

  getConnectedScreensCount(organizationId: string): number {
    const room = this.server.sockets.adapter.rooms.get(`org:${organizationId}`);
    return room?.size ?? 0;
  }

  isScreenOnline(deviceCode: string): boolean {
    return this.connectedDevices.has(deviceCode);
  }

  private async validateDeviceToken(token: string): Promise<string | null> {
    try {
      // For device tokens, we expect { deviceCode, type: 'device' } payload
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwtSecret'),
      });
      if (payload.type === 'device' && payload.deviceCode) {
        return payload.deviceCode;
      }
      return null;
    } catch {
      return null;
    }
  }
}
