import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, ManyToMany, JoinTable, JoinColumn, OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Organization } from './organization.entity';
import { Role } from './role.entity';
import { AuditLog } from './audit-log.entity';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column()
  @Exclude() // Never serialize password
  password: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ default: false })
  isSuperAdmin: boolean; // cross-org admin

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.users, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToMany(() => Role, (role) => role.users, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ nullable: true })
  @Exclude()
  refreshTokenHash: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  lastLoginIp: string;

  @Column({ default: 0 })
  failedLoginAttempts: number;

  @Column({ nullable: true })
  lockedUntil: Date;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  verificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verificationCodeExpiresAt: Date | null;

  @Column({ default: false })
  twoFactorEnabled: boolean;

  @Column({ nullable: true })
  @Exclude()
  twoFactorSecret: string;

  @Column({ type: 'json', nullable: true })
  preferences: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => AuditLog, (log) => log.user)
  auditLogs: AuditLog[];

  // Computed helper
  get permissions(): string[] {
    if (!this.roles) return [];
    return this.roles.flatMap((role) =>
      role.permissions?.map((p) => `${p.resource}:${p.action}`) ?? [],
    );
  }

  get hasAnyRole(): boolean {
    return this.roles?.length > 0;
  }
}
