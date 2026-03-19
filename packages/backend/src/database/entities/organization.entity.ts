import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { User } from './user.entity';
import { Screen } from './screen.entity';
import { MediaFile } from './media-file.entity';
import { Campaign } from './campaign.entity';
import { Playlist } from './playlist.entity';

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index()
  name: string;

  @Column({ length: 100, unique: true })
  slug: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true })
  primaryColor: string;

  @Column({ type: 'enum', enum: PlanType, default: PlanType.FREE })
  plan: PlanType;

  @Column({ default: 5 })
  maxScreens: number;

  @Column({ type: 'bigint', default: 5368709120 }) // 5GB default
  maxStorageBytes: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  settings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => Screen, (screen) => screen.organization)
  screens: Screen[];

  @OneToMany(() => MediaFile, (file) => file.organization)
  mediaFiles: MediaFile[];

  @OneToMany(() => Campaign, (campaign) => campaign.organization)
  campaigns: Campaign[];

  @OneToMany(() => Playlist, (playlist) => playlist.organization)
  playlists: Playlist[];
}
