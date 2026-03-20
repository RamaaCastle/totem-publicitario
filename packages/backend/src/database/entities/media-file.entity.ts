import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany, Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { PlaylistItem } from './playlist-item.entity';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
}

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  originalName: string;

  @Column({ length: 255 })
  @Index()
  storagePath: string; // relative path in storage

  @Column({ length: 512, nullable: true })
  publicUrl: string; // served URL

  @Column({ length: 512, nullable: true })
  thumbnailUrl: string;

  @Column({ type: 'enum', enum: MediaType })
  type: MediaType;

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  sizeBytes: number;

  @Column({ type: 'enum', enum: MediaStatus, default: MediaStatus.READY })
  status: MediaStatus;

  @Column({ nullable: true })
  width: number;

  @Column({ nullable: true })
  height: number;

  @Column({ nullable: true, type: 'float' })
  durationSeconds: number; // for videos

  @Column({ nullable: true })
  checksum: string; // SHA-256 for dedup and integrity

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.mediaFiles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  uploadedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploadedById' })
  uploadedBy: User;

  @OneToMany(() => PlaylistItem, (item) => item.mediaFile)
  playlistItems: PlaylistItem[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
