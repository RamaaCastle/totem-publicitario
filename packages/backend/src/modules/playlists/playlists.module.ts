import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlaylistsController } from './playlists.controller';
import { PlaylistsService } from './playlists.service';
import { Playlist } from '../../database/entities/playlist.entity';
import { PlaylistItem } from '../../database/entities/playlist-item.entity';
import { MediaFile } from '../../database/entities/media-file.entity';
import { Screen } from '../../database/entities/screen.entity';
import { ScreensModule } from '../screens/screens.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Playlist, PlaylistItem, MediaFile, Screen]), ScreensModule, AuditModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
