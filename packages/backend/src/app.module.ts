import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import mailConfig from './config/mail.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ScreensModule } from './modules/screens/screens.module';
import { MediaModule } from './modules/media/media.module';
import { PlaylistsModule } from './modules/playlists/playlists.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DevicesModule } from './modules/devices/devices.module';
import { AuditModule } from './modules/audit/audit.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, mailConfig],
      envFilePath: ['.env', '../../.env'],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...config.get('database'),
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: parseInt(config.get('THROTTLE_TTL', '60'), 10) * 1000,
            limit: parseInt(config.get('THROTTLE_LIMIT', '100'), 10),
          },
        ],
      }),
    }),

    // Serve admin panel static files
    // - production (Docker): dist/public/  (admin out copied there at build)
    // - development:         packages/admin/out/
    ServeStaticModule.forRoot({
      rootPath: process.env.NODE_ENV === 'production'
        ? join(__dirname, 'public')
        : join(__dirname, '../../admin/out'),
      exclude: ['/api*', '/socket.io*'],
      serveStaticOptions: { fallthrough: true },
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    ScreensModule,
    MediaModule,
    PlaylistsModule,
    CampaignsModule,
    DevicesModule,
    AuditModule,
    MailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
