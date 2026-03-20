import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany,
} from 'typeorm';
import { Role } from './role.entity';

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage', // all actions
}

export enum PermissionResource {
  USERS = 'users',
  ROLES = 'roles',
  SCREENS = 'screens',
  SCREEN_GROUPS = 'screen_groups',
  MEDIA = 'media',
  CAMPAIGNS = 'campaigns',
  PLAYLISTS = 'playlists',
  ORGANIZATIONS = 'organizations',
  REPORTS = 'reports',
  AUDIT_LOGS = 'audit_logs',
  SYSTEM = 'system',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  name: string; // e.g. "campaigns:create"

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PermissionAction })
  action: PermissionAction;

  @Column({ type: 'enum', enum: PermissionResource })
  resource: PermissionResource;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
