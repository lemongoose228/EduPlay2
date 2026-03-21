import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Game } from './game.entity';

@Entity('game_likes')
export class GameLike {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  gameId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @CreateDateColumn()
  createdAt: Date;
}
