import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Team } from './team.entity';

@Entity('players')
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: false })
  isHost: boolean;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Team, (team) => team.players, {
    onDelete: 'CASCADE',
  })
  team: Team;

  @Column()
  teamId: string;

  @CreateDateColumn()
  joinedAt: Date;
}