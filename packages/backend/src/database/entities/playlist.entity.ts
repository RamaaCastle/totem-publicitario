import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { PlaylistItem } from './playlist-item.entity';
import { Campaign } from './campaign.entity';

@Entity('playlists')
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 10 })
  defaultDurationSeconds: number; // default slide duration for images

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.playlists, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => PlaylistItem, (item) => item.playlist, {
    cascade: true,
    eager: false,
  })
  items: PlaylistItem[];

  @OneToMany(() => Campaign, (campaign) => campaign.playlist)
  campaigns: Campaign[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
