import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository, In } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { Game } from './entities/game.entity';
import { GameLike } from './entities/game-like.entity';
import { Category } from './entities/category.entity';
import { Question } from './entities/question.entity';
import { Session } from '../sessions/entities/session.entity';
import { CategoryDto, CreateGameDto, GAME_AGE_PLUS_CODE, GAME_AGE_SCALE_MIN } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PublishGameDto } from './dto/publish-game.dto';
import { MyGamesQueryDto } from './dto/my-games-query.dto';
import { applyGameAgeOverlapFilter } from './game-age-query.util';

@Injectable()
export class GamesService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');
  private readonly questionImagesSubdir = 'question-images';

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

  private async ensureUploadDirs() {
    await fs.mkdir(join(this.uploadRoot, this.questionImagesSubdir), { recursive: true });
  }

  private resolveAgePair(
    ageFrom: number | null | undefined,
    ageTo: number | null | undefined,
  ): [number | null, number | null] {
    const fromDef = ageFrom !== undefined;
    const toDef = ageTo !== undefined;
    if (!fromDef && !toDef) {
      return [null, null];
    }
    if (!fromDef || !toDef) {
      throw new BadRequestException('Укажите возраст «от» и «до» вместе');
    }
    if (ageFrom === null && ageTo === null) {
      return [null, null];
    }
    if (ageFrom === null || ageTo === null) {
      throw new BadRequestException('Укажите возраст «от» и «до» вместе');
    }
    if (
      !Number.isInteger(ageFrom) ||
      !Number.isInteger(ageTo) ||
      ageFrom < GAME_AGE_SCALE_MIN ||
      ageFrom > GAME_AGE_PLUS_CODE ||
      ageTo < GAME_AGE_SCALE_MIN ||
      ageTo > GAME_AGE_PLUS_CODE
    ) {
      throw new BadRequestException(`Возраст должен быть в диапазоне ${GAME_AGE_SCALE_MIN}–${GAME_AGE_PLUS_CODE}`);
    }
    if (ageFrom > ageTo) {
      throw new BadRequestException('Возраст «от» не может быть больше «до»');
    }
    return [ageFrom, ageTo];
  }

  async create(userId: string, createGameDto: CreateGameDto): Promise<Game> {
    const { ageFrom, ageTo, ...rest } = createGameDto;
    const [af, at] = this.resolveAgePair(ageFrom, ageTo);
    const game = this.gamesRepository.create({
      ...rest,
      ageFrom: af,
      ageTo: at,
      authorId: userId,
      status: 'draft',
    });

    return this.gamesRepository.save(game);
  }

  async findAll(userId: string, dto: MyGamesQueryDto = {}): Promise<Game[]> {
    const qb = this.gamesRepository.createQueryBuilder('game');
    qb.where('game.authorId = :userId', { userId });

    const { search, type, sortBy, ageFrom, ageTo, status } = dto;

    if (status) {
      qb.andWhere('game.status = :status', { status });
    }

    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        new Brackets((q) => {
          q.where('game.title ILIKE :term', { term }).orWhere('game.description ILIKE :term', { term });
        }),
      );
    }

    if (type) {
      qb.andWhere('game.type = :type', { type });
    }

    if (ageFrom !== undefined && ageTo !== undefined && ageFrom > ageTo) {
      throw new BadRequestException('Некорректный фильтр по возрасту');
    }
    if (ageFrom !== undefined && ageTo === undefined) {
      throw new BadRequestException('Передайте ageFrom и ageTo вместе');
    }
    if (ageTo !== undefined && ageFrom === undefined) {
      throw new BadRequestException('Передайте ageFrom и ageTo вместе');
    }
    if (ageFrom !== undefined && ageTo !== undefined) {
      applyGameAgeOverlapFilter(qb, 'game', ageFrom, ageTo);
    }

    switch (sortBy) {
      case 'likes':
        qb.orderBy('game.likes', 'DESC').addOrderBy('game.createdAt', 'DESC');
        break;
      default:
        qb.orderBy('game.createdAt', 'DESC');
        break;
    }

    const games = await qb.getMany();
    if (games.length === 0) {
      return [];
    }

    const ids = games.map((g) => g.id);
    const withRelations = await this.gamesRepository.find({
      where: { id: In(ids) },
      relations: ['categories', 'categories.questions'],
    });

    const orderIndex = new Map(ids.map((id, i) => [id, i]));
    withRelations.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    return withRelations;
  }

  async findOne(id: string, userId?: string): Promise<Game> {
    const game = await this.gamesRepository.findOne({
      where: { id },
      relations: ['categories', 'categories.questions'],
    });

    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    if (game.isBlocked) {
      throw new ForbiddenException('Игра заблокирована');
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

    const { categories, ageFrom, ageTo, ...gameFields } = updateGameDto;

    const touchesAge =
      typeof updateGameDto === 'object' &&
      updateGameDto !== null &&
      ('ageFrom' in updateGameDto || 'ageTo' in updateGameDto);

    if (touchesAge) {
      if (!('ageFrom' in updateGameDto) || !('ageTo' in updateGameDto)) {
        throw new BadRequestException('Укажите возраст «от» и «до» вместе');
      }
      const resolved = this.resolveAgePair(
        updateGameDto.ageFrom as number | null | undefined,
        updateGameDto.ageTo as number | null | undefined,
      );
      game.ageFrom = resolved[0];
      game.ageTo = resolved[1];
    }

    Object.assign(game, gameFields);

    if (categories !== undefined) {
      await this.replaceGameCategories(game, categories);
    }

    return this.gamesRepository.save(game);
  }

  private async replaceGameCategories(game: Game, categories: CategoryDto[]): Promise<void> {
    await this.categoriesRepository.delete({ gameId: game.id });

    game.categories = categories.map((catDto, index) =>
      this.categoriesRepository.create({
        name: catDto.name,
        order: index,
        gameId: game.id,
        questions: catDto.questions.map((qDto) =>
          this.questionsRepository.create({
            question: qDto.question,
            answer: qDto.answer,
            value: qDto.value,
            imageUrl: qDto.imageUrl ?? null,
          }),
        ),
      }),
    );
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

  async unpublish(id: string, userId: string): Promise<Game> {
    const game = await this.findOne(id, userId);

    if (game.authorId !== userId) {
      throw new ForbiddenException('Нет прав на снятие публикации этой игры');
    }

    if (game.status !== 'published') {
      throw new BadRequestException('Игра не опубликована');
    }

    game.status = 'draft';
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
    if (game.isBlocked) {
      throw new BadRequestException('Нельзя лайкать заблокированную игру');
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

  async storeQuestionImageUpload(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Пустой файл');
    }

    await this.ensureUploadDirs();

    const ext = this.extensionFromMimetype(file.mimetype);
    const filename = `question-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const diskPath = join(this.uploadRoot, this.questionImagesSubdir, filename);
    await fs.writeFile(diskPath, file.buffer);

    return {
      url: `/uploads/${this.questionImagesSubdir}/${filename}`,
    };
  }

  private extensionFromMimetype(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mimetype] || '.bin';
  }

  /** Принимает UUID или числовой publicId из UI. */
  async resolveIdToUuid(raw: string): Promise<string> {
    const t = raw.trim();
    if (!t) {
      throw new NotFoundException('Игра не найдена');
    }
    if (/^\d+$/.test(t)) {
      const byPublic = await this.gamesRepository.findOne({
        where: { publicId: t },
      });
      if (!byPublic) {
        throw new NotFoundException('Игра не найдена');
      }
      return byPublic.id;
    }
    const game = await this.gamesRepository.findOne({ where: { id: t } });
    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }
    return t;
  }

  async setBlocked(
    gameId: string,
    blockedByUserId: string,
    isBlocked: boolean,
    reason?: string | null,
  ): Promise<Game> {
    const internalId = await this.resolveIdToUuid(gameId);
    const game = await this.gamesRepository.findOne({ where: { id: internalId } });
    if (!game) {
      throw new NotFoundException('Игра не найдена');
    }

    game.isBlocked = isBlocked;
    game.blockedAt = isBlocked ? new Date() : null;
    game.blockedReason = isBlocked ? reason?.trim() || null : null;
    game.blockedByUserId = isBlocked ? blockedByUserId : null;

    return this.gamesRepository.save(game);
  }
}