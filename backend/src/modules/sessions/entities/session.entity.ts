import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Game } from '../../games/entities/game.entity';
import { Team } from './team.entity';

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'finished';

export type CrocodileTermResult = 'guessed' | 'missed';

export interface CrocodileState {
  termOrder: string[];
  currentTermId: string | null;
  turnEndsAt: string | null;
  termResults: Array<{
    termId: string;
    result: CrocodileTermResult;
  }>;
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  inviteCode: string;

  
  @Column({ type: 'boolean', nullable: true })
  multiplayer: boolean | null;

  @Column({
    type: 'enum',
    enum: ['waiting', 'active', 'paused', 'finished'],
    default: 'waiting',
  })
  status: SessionStatus;

  @ManyToOne(() => Game)
  game: Game;

  @Column()
  gameId: string;

  @ManyToOne(() => User)
  host: User;

  @Column()
  hostId: string;

  @OneToMany(() => Team, (team) => team.session, {
    cascade: true,
    eager: true,
  })
  teams: Team[];

  @Column({ nullable: true })
  currentQuestionIndex: number;

  @Column({ type: 'timestamp', nullable: true })
  questionStartedAt: Date | null;

  @Column({ type: 'jsonb', default: [] })
  answeredQuestions: Array<{
    categoryId: string;
    questionId: string;
    userId?: string;
    teamId?: string;
    isCorrect?: boolean;
    submittedAnswer?: string;
    scored?: boolean;
  }>;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    maxTeams: number;
    maxPlayersPerTeam: number;
    timePerQuestion: number;
    timePerTerm?: number;
    allowNegativeScores: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  crocodileState?: CrocodileState | null;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}