import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from './user.entity';

export enum AuditAction {
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  USER_CREATED = 'users.created',
  USER_UPDATED = 'users.updated',
  USER_DELETED = 'users.deleted',
  SCREEN_REGISTERED = 'screens.registered',
  SCREEN_UPDATED = 'screens.updated',
  SCREEN_DELETED = 'screens.deleted',
  CAMPAIGN_CREATED = 'campaigns.created',
  CAMPAIGN_UPDATED = 'campaigns.updated',
  CAMPAIGN_DELETED = 'campaigns.deleted',
  CAMPAIGN_ASSIGNED = 'campaigns.assigned',
  PLAYLIST_CREATED = 'playlists.created',
  PLAYLIST_UPDATED = 'playlists.updated',
  PLAYLIST_DELETED = 'playlists.deleted',
  MEDIA_UPLOADED = 'media.uploaded',
  MEDIA_DELETED = 'media.deleted',
  ROLE_CREATED = 'roles.created',
  ROLE_UPDATED = 'roles.updated',
  ROLE_DELETED = 'roles.deleted',
}

@Entity('audit_logs')
@Index(['organizationId', 'createdAt'])
@Index(['userId', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  @Index()
  organizationId: string;

  @Column({ nullable: true })
  targetId: string; // ID of the affected resource

  @Column({ nullable: true })
  targetType: string; // entity type (e.g. "Screen")

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'json', nullable: true })
  before: Record<string, any>; // state before change

  @Column({ type: 'json', nullable: true })
  after: Record<string, any>; // state after change

  @Column({ type: 'json', nullable: true })
  meta: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
