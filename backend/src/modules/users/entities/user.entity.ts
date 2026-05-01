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
import { UserRole } from './user-role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Заполняется автоматически (sequence); nullable нужен, чтобы synchronize не ломался на старых строках. */
  @Column({ type: 'bigint', unique: true, nullable: true })
  publicId!: string | null;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  avatar!: string | null;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role!: UserRole;

  @Column({ default: false })
  isBlocked!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  blockedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  blockedReason!: string | null;

  @OneToMany(() => Game, (game) => game.author)
  games!: Game[];

  @OneToMany(() => Session, (session) => session.host)
  hostedSessions!: Session[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}