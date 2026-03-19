import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn,
} from 'typeorm';
import { Screen } from './screen.entity';

// Tokens issued to player devices for authentication
@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  token: string; // hashed JWT or opaque token

  @Column()
  screenId: string;

  @ManyToOne(() => Screen, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screenId' })
  screen: Screen;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
