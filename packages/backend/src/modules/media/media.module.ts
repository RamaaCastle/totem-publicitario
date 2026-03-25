import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { MediaFile } from '../../database/entities/media-file.entity';
import { Organization } from '../../database/entities/organization.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([MediaFile, Organization]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uploadDir = config.get<string>('app.uploadDir', './uploads');
        if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

        return {
          storage: diskStorage({
            destination: (req, file, cb) => {
              const orgId = (req as any).user?.organizationId || 'unknown';
              const dir = join(uploadDir, orgId);
              if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
              cb(null, dir);
            },
            filename: (_req, file, cb) => {
              const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
              cb(null, uniqueName);
            },
          }),
          limits: {
            fileSize: config.get<number>('app.maxFileSizeMb', 500) * 1024 * 1024,
          },
          fileFilter: (_req, file, cb) => {
            const allowed = [
              ...config.get<string[]>('app.allowedImageTypes', []),
              ...config.get<string[]>('app.allowedVideoTypes', []),
            ];
            if (allowed.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new Error(`File type ${file.mimetype} not allowed`), false);
            }
          },
        };
      },
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
