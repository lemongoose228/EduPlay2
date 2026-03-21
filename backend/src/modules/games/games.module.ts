import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';
import { Game } from './entities/game.entity';
import { GameLike } from './entities/game-like.entity';
import { Category } from './entities/category.entity';
import { Question } from './entities/question.entity';
import { Session } from '../sessions/entities/session.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameLike, Category, Question, Session])],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}