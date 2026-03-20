import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { Screen } from '../../database/entities/screen.entity';
import { DeviceToken } from '../../database/entities/device-token.entity';
import { Heartbeat } from '../../database/entities/heartbeat.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Screen, DeviceToken, Heartbeat]), JwtModule],
  controllers: [DevicesController],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
