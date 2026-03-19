import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Game } from '../../games/entities/game.entity';
import { Session } from '../../sessions/entities/session.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  avatar!: string | null;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @OneToMany(() => Game, (game) => game.author)
  games!: Game[];

  @OneToMany(() => Session, (session) => session.host)
  hostedSessions!: Session[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}