import {
  Controller, Post, Get, Body, Param, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { DevicesService } from './devices.service';
import { Public } from '../../common/decorators/permissions.decorator';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Player calls this on first boot with the device code shown on screen.
   * Returns a long-lived device token.
   */
  @Post('register/:deviceCode')
  @Public()
  @ApiOperation({ summary: 'Register/pair a player device' })
  register(@Param('deviceCode') deviceCode: string, @Body() meta: any) {
    return this.devicesService.registerDevice(deviceCode.toUpperCase(), meta);
  }

  /**
   * Player fetches its current playlist config.
   * This endpoint is public but requires a valid deviceCode.
   */
  @Get('config/:deviceCode')
  @Public()
  @ApiOperation({ summary: 'Get current playlist config for device' })
  getConfig(@Param('deviceCode') deviceCode: string) {
    return this.devicesService.getDeviceConfig(deviceCode.toUpperCase());
  }

  /**
   * Player sends heartbeat every 30 seconds.
   */
  @Post('heartbeat/:deviceCode')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 30000 } })
  @ApiOperation({ summary: 'Receive heartbeat from player device' })
  heartbeat(
    @Param('deviceCode') deviceCode: string,
    @Body() data: any,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.devicesService.processHeartbeat(deviceCode.toUpperCase(), data, ip);
  }
}
