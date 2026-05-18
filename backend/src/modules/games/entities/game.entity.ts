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
import { Category } from './category.entity';

export type GameType = 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';
export type GameStatus = 'draft' | 'published' | 'archived';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Заполняется автоматически (sequence); nullable нужен, чтобы synchronize не ломался на старых строках. */
  @Column({ type: 'bigint', unique: true, nullable: true })
  publicId: string | null;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['own', 'quiz', 'crocodile', 'wheel', 'station', 'tictactoe'],
    default: 'own',
  })
  type: GameType;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: GameStatus;

  @Column({ default: false })
  isBlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  blockedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  blockedReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  blockedByUserId: string | null;

  @Column({ default: 0 })
  plays: number;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ default: 0 })
  likes: number;

  @ManyToOne(() => User, (user) => user.games)
  author: User;

  @Column()
  authorId: string;

  @OneToMany(() => Category, (category) => category.game, {
    cascade: true,
    eager: true,
  })
  categories: Category[];

  @Column({ type: 'jsonb', nullable: true })
  settings: {
    timePerQuestion?: number;
    timePerTerm?: number;
    allowNegativeScores?: boolean;
  };

  /** Код шкалы 2 («до 3») … 26 («25+»), null = любой возраст */
  @Column({ type: 'int', nullable: true })
  ageFrom: number | null;

  @Column({ type: 'int', nullable: true })
  ageTo: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}