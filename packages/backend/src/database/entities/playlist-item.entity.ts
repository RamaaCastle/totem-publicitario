import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Playlist } from './playlist.entity';
import { MediaFile } from './media-file.entity';

@Entity('playlist_items')
export class PlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playlistId: string;

  @ManyToOne(() => Playlist, (playlist) => playlist.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @Column()
  mediaFileId: string;

  @ManyToOne(() => MediaFile, (file) => file.playlistItems, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'mediaFileId' })
  mediaFile: MediaFile;

  @Column({ default: 0 })
  order: number; // display order within playlist

  @Column({ nullable: true })
  durationSeconds: number; // override default playlist duration (null = use playlist default)

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
