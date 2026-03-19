import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { Campaign } from './campaign.entity';
import { Screen } from './screen.entity';
import { ScreenGroup } from './screen-group.entity';

// A campaign can be assigned to individual screens or groups of screens
@Entity('campaign_assignments')
export class CampaignAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  campaignId: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.assignments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign: Campaign;

  @Column({ nullable: true })
  screenId: string;

  @ManyToOne(() => Screen, (screen) => screen.assignments, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'screenId' })
  screen: Screen;

  @Column({ nullable: true })
  screenGroupId: string;

  @ManyToOne(() => ScreenGroup, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'screenGroupId' })
  screenGroup: ScreenGroup;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
