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

export type GameType = 'own' | 'quiz';
export type GameStatus = 'draft' | 'published' | 'archived';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ['own', 'quiz'],
    default: 'own',
  })
  type: GameType;

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
  })
  status: GameStatus;

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
    allowNegativeScores?: boolean;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}