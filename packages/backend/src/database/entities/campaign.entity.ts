import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, OneToMany,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { Playlist } from './playlist.entity';
import { CampaignAssignment } from './campaign-assignment.entity';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum CampaignPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
}

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 500, nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'int', default: CampaignPriority.NORMAL })
  priority: number;

  @Column({ nullable: true, type: 'timestamp' })
  startsAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  endsAt: Date;

  // Schedule: days of week (0=Sun, 6=Sat)
  @Column({ type: 'simple-array', nullable: true })
  scheduleDays: string[];

  // Schedule: time window
  @Column({ nullable: true, length: 5 })
  scheduleTimeFrom: string; // "HH:MM"

  @Column({ nullable: true, length: 5 })
  scheduleTimeTo: string; // "HH:MM"

  @Column({ nullable: true })
  playlistId: string;

  @ManyToOne(() => Playlist, (playlist) => playlist.campaigns, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.campaigns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @Column({ nullable: true })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @OneToMany(() => CampaignAssignment, (assignment) => assignment.campaign)
  assignments: CampaignAssignment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
