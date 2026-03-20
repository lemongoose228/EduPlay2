import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game } from './entities/game.entity';
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

    // Если игра не опубликована, проверяем права доступа
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

    // Проверяем, что игра заполнена
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

  // Удаляем связанные сессии
  await this.sessionsRepository.delete({ gameId: id });
  
  // Теперь можно безопасно удалить игру
  await this.gamesRepository.remove(game);
}

  async incrementPlays(id: string): Promise<void> {
    await this.gamesRepository.increment({ id }, 'plays', 1);
  }
}