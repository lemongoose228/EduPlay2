import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
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
      .where('game.status = :status', { status: 'published' })
      .andWhere('game.isBlocked = :isBlocked', { isBlocked: false });

    if (search) {
      const s = search.trim();
      const isDigitsOnly = /^\d+$/.test(s);
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('game.title ILIKE :textSearch', { textSearch: `%${s}%` })
            .orWhere('game.description ILIKE :textSearch', { textSearch: `%${s}%` })
            .orWhere('author.name ILIKE :textSearch', { textSearch: `%${s}%` });
          if (isDigitsOnly) {
            qb.orWhere('author.publicId = :pubUser', { pubUser: s }).orWhere(
              'game.publicId = :pubGame',
              { pubGame: s },
            );
          }
        }),
      );
    }

    if (type) {
      queryBuilder.andWhere('game.type = :type', { type });
    }

    switch (sortBy) {
      case 'likes':
        queryBuilder.orderBy('game.likes', 'DESC');
        break;
      case 'newest':
        queryBuilder.orderBy('game.createdAt', 'DESC');
        break;
    }

    const [items, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const itemsWithUsage = items.map((item) => ({
      ...item,
      usageCount: item.plays ?? 0,
    }));

    return {
      items: itemsWithUsage,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPopular(limit: number = 10) {
    const items = await this.gamesRepository.find({
      where: { status: 'published', isBlocked: false },
      relations: ['author'],
      order: { plays: 'DESC' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      usageCount: item.plays ?? 0,
    }));
  }

  async getTopRated(limit: number = 10) {
    const items = await this.gamesRepository.find({
      where: { status: 'published', isBlocked: false },
      relations: ['author'],
      order: { likes: 'DESC' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      usageCount: item.plays ?? 0,
    }));
  }

  async getRecent(limit: number = 10) {
    const items = await this.gamesRepository.find({
      where: { status: 'published', isBlocked: false },
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return items.map((item) => ({
      ...item,
      usageCount: item.plays ?? 0,
    }));
  }
}