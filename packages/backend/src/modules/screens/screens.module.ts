import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ScreensController } from './screens.controller';
import { ScreensService } from './screens.service';
import { Screen } from '../../database/entities/screen.entity';
import { ScreenGroup } from '../../database/entities/screen-group.entity';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { Heartbeat } from '../../database/entities/heartbeat.entity';
import { ScreensGateway } from '../../gateways/screens.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Screen, ScreenGroup, AuditLog, Heartbeat]), JwtModule],
  controllers: [ScreensController],
  providers: [ScreensService, ScreensGateway],
  exports: [ScreensService, ScreensGateway],
})
export class ScreensModule {}
