import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToMany, ManyToOne, JoinColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { Screen } from './screen.entity';

@Entity('screen_groups')
export class ScreenGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255, nullable: true })
  description: string;

  @Column({ nullable: true })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @ManyToMany(() => Screen, (screen) => screen.groups)
  screens: Screen[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
