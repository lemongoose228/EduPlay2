import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
import { GameLike } from './entities/game-like.entity';
import { Category } from './entities/category.entity';
import { Question } from './entities/question.entity';
import { Session } from '../sessions/entities/session.entity';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PublishGameDto } from './dto/publish-game.dto';

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
    @InjectRepository(GameLike)
    private gameLikesRepository: Repository<GameLike>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
  ) {}

  async create(userId: string, createGameDto: CreateGameDto): Promise<Game> {
    const game = this.gamesRepository.create({
      ...createGameDto,
      authorId: userId,
      status: 'draft',
    });

    return this.gamesRepository.save(game);
  }

  async findAll(userId: string): Promise<Game[]> {
    return this.gamesRepository.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId?: string): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['categories', 'categories.questions'],
    });

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.status !== 'published' && userId !== game.authorId) {
      throw new ForbiddenException('Нет доступа к этой игре');
    }

    return game;
  }

  async update(id: string, userId: string, updateGameDto: UpdateGameDto): Promise<Game> {
    const game = await this.findOne(id, userId);

    if (game.authorId !== userId) {
      throw new ForbiddenException('Нет прав на редактирование этой игры');
    }

    Object.assign(game, updateGameDto);
    return this.gamesRepository.save(game);
  }

  async publish(id: string, userId: string, publishGameDto: PublishGameDto): Promise<Game> {
    const game = await this.findOne(id, userId);

    if (game.authorId !== userId) {
      throw new ForbiddenException('Нет прав на публикацию этой игры');
    }

    if (!game.categories || game.categories.length === 0) {
      throw new ForbiddenException('Нельзя опубликовать пустую игру');
    }

    for (const category of game.categories) {
      if (!category.questions || category.questions.length === 0) {
        throw new ForbiddenException('Все категории должны содержать вопросы');
      }
    }

    game.status = 'published';
    if (publishGameDto.title) game.title = publishGameDto.title;
    if (publishGameDto.description) game.description = publishGameDto.description;

    return this.gamesRepository.save(game);
  }

async remove(id: string, userId: string): Promise<void> {
  const game = await this.findOne(id, userId);

  if (game.authorId !== userId) {
    throw new ForbiddenException('Нет прав на удаление этой игры');
  }

  await this.gameLikesRepository.delete({ gameId: id });
  await this.sessionsRepository.delete({ gameId: id });

  await this.gamesRepository.remove(game);
}

  async like(userId: string, gameId: string): Promise<{ likes: number }> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }
    if (game.status !== 'published') {
      throw new BadRequestException('Можно лайкать только опубликованные игры');
    }
    const existing = await this.gameLikesRepository.findOne({
      where: { userId, gameId },
    });
    if (existing) {
      return { likes: game.likes };
    }
    await this.gameLikesRepository.save({ userId, gameId });
    await this.gamesRepository.increment({ id: gameId }, 'likes', 1);
    return { likes: game.likes + 1 };
  }

  async unlike(userId: string, gameId: string): Promise<{ likes: number }> {
    const game = await this.gamesRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }
    const result = await this.gameLikesRepository.delete({ userId, gameId });
    if (result.affected && result.affected > 0 && game.likes > 0) {
      await this.gamesRepository.decrement({ id: gameId }, 'likes', 1);
      return { likes: game.likes - 1 };
    }
    return { likes: game.likes };
  }

  async getLikedGameIds(userId: string): Promise<string[]> {
    const likes = await this.gameLikesRepository.find({
      where: { userId },
      select: ['gameId'],
    });
    return likes.map((l) => l.gameId);
  }

  async incrementPlays(id: string): Promise<void> {
    await this.gamesRepository.increment({ id }, 'plays', 1);
  }
}