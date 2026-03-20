import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Screen } from './screen.entity';

@Entity('heartbeats')
@Index(['screenId', 'createdAt'])
export class Heartbeat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  screenId: string;

  @ManyToOne(() => Screen, (screen) => screen.heartbeats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'screenId' })
  screen: Screen;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  appVersion: string;

  @Column({ nullable: true })
  currentPlaylistId: string;

  @Column({ nullable: true, type: 'float' })
  cpuUsage: number;

  @Column({ nullable: true, type: 'float' })
  memoryUsage: number;

  @Column({ type: 'json', nullable: true })
  extra: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
