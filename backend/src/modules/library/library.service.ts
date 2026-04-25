import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Game } from '../games/entities/game.entity';
import { SearchGamesDto } from './dto/search-games.dto';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Game)
    private gamesRepository: Repository<Game>,
  ) {}

  async search(searchDto: SearchGamesDto) {
    const { search, type, sortBy, page = 1, limit = 12 } = searchDto;
    
    const queryBuilder = this.gamesRepository
      .createQueryBuilder('game')
      .leftJoinAndSelect('game.author', 'author')
      .where('game.status = :status', { status: 'published' });

    if (search) {
      queryBuilder.andWhere(
        '(game.title ILIKE :search OR game.description ILIKE :search OR author.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (type) {
      queryBuilder.andWhere('game.type = :type', { type });
    }

    switch (sortBy) {
      case 'popular':
        queryBuilder.orderBy('game.plays', 'DESC');
        break;
      case 'likes':
        queryBuilder.orderBy('game.likes', 'DESC');
        break;
      case 'newest':
        queryBuilder.orderBy('game.createdAt', 'DESC');
        break;
      default:
        queryBuilder.orderBy('game.plays', 'DESC');
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPopular(limit: number = 10) {
    return this.gamesRepository.find({
      where: { status: 'published' },
      relations: ['author'],
      order: { plays: 'DESC' },
      take: limit,
    });
  }

  async getTopRated(limit: number = 10) {
    return this.gamesRepository.find({
      where: { status: 'published' },
      relations: ['author'],
      order: { likes: 'DESC' },
      take: limit,
    });
  }

  async getRecent(limit: number = 10) {
    return this.gamesRepository.find({
      where: { status: 'published' },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}