import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Session } from './session.entity';
import { Player } from './player.entity';

@Entity('teams')
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  score: number;

  @ManyToOne(() => Session, (session) => session.teams, {
    onDelete: 'CASCADE',
  })
  session: Session;

  @Column()
  sessionId: string;

  @OneToMany(() => Player, (player) => player.team, {
    cascade: true,
    eager: true,
  })
  players: Player[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}