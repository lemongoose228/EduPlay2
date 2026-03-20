"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const game_entity_1 = require("../games/entities/game.entity");
let LibraryService = class LibraryService {
    constructor(gamesRepository) {
        this.gamesRepository = gamesRepository;
    }
    async search(searchDto) {
        const { search, type, sortBy, page = 1, limit = 12 } = searchDto;
        const queryBuilder = this.gamesRepository
            .createQueryBuilder('game')
            .leftJoinAndSelect('game.author', 'author')
            .where('game.status = :status', { status: 'published' });
        if (search) {
            queryBuilder.andWhere('(game.title ILIKE :search OR game.description ILIKE :search OR author.name ILIKE :search)', { search: `%${search}%` });
        }
        if (type) {
            queryBuilder.andWhere('game.type = :type', { type });
        }
        // Сортировка
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
        // Пагинация
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
    async getPopular(limit = 10) {
        return this.gamesRepository.find({
            where: { status: 'published' },
            relations: ['author'],
            order: { plays: 'DESC' },
            take: limit,
        });
    }
    async getTopRated(limit = 10) {
        return this.gamesRepository.find({
            where: { status: 'published' },
            relations: ['author'],
            order: { likes: 'DESC' },
            take: limit,
        });
    }
    async getRecent(limit = 10) {
        return this.gamesRepository.find({
            where: { status: 'published' },
            relations: ['author'],
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
};
exports.LibraryService = LibraryService;
exports.LibraryService = LibraryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(game_entity_1.Game)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], LibraryService);
