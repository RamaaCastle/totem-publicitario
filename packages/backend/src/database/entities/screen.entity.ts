import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, ManyToMany, JoinTable, JoinColumn, OneToMany,
} from 'typeorm';
import { Organization } from './organization.entity';
import { ScreenGroup } from './screen-group.entity';
import { CampaignAssignment } from './campaign-assignment.entity';
import { Heartbeat } from './heartbeat.entity';

export enum ScreenStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  MAINTENANCE = 'maintenance',
}

export enum ScreenOrientation {
  LANDSCAPE = 'landscape',
  PORTRAIT = 'portrait',
}

export enum ScreenType {
  TV = 'tv',
  TOTEM = 'totem',
}

@Entity('screens')
export class Screen {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  deviceCode: string; // e.g. "ABC123" — shown on TV during pairing

  @Column({ nullable: true, length: 255 })
  description: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'enum', enum: ScreenStatus, default: ScreenStatus.OFFLINE })
  status: ScreenStatus;

  @Column({ type: 'enum', enum: ScreenOrientation, default: ScreenOrientation.LANDSCAPE })
  orientation: ScreenOrientation;

  @Column({ type: 'enum', enum: ScreenType, default: ScreenType.TV })
  screenType: ScreenType;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastSeenAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ nullable: true })
  osInfo: string;

  @Column({ nullable: true })
  currentPlaylistId: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.screens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToMany(() => ScreenGroup, (group) => group.screens)
  @JoinTable({
    name: 'screen_group_screens',
    joinColumn: { name: 'screenId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'groupId', referencedColumnName: 'id' },
  })
  groups: ScreenGroup[];

  @OneToMany(() => CampaignAssignment, (assignment) => assignment.screen)
  assignments: CampaignAssignment[];

  @OneToMany(() => Heartbeat, (hb) => hb.screen)
  heartbeats: Heartbeat[];

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
