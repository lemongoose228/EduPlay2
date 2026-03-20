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
exports.GamesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const game_entity_1 = require("./entities/game.entity");
const category_entity_1 = require("./entities/category.entity");
const question_entity_1 = require("./entities/question.entity");
let GamesService = class GamesService {
    constructor(gamesRepository, categoriesRepository, questionsRepository) {
        this.gamesRepository = gamesRepository;
        this.categoriesRepository = categoriesRepository;
        this.questionsRepository = questionsRepository;
    }
    async create(userId, createGameDto) {
        const game = this.gamesRepository.create({
            ...createGameDto,
            authorId: userId,
            status: 'draft',
        });
        return this.gamesRepository.save(game);
    }
    async findAll(userId) {
        return this.gamesRepository.find({
            where: { authorId: userId },
            order: { createdAt: 'DESC' },
        });
    }
    async findOne(id, userId) {
        const game = await this.gamesRepository.findOne({
            where: { id },
            relations: ['categories', 'categories.questions'],
        });
        if (!game) {
            throw new common_1.NotFoundException('Игра не найдена');
        }
        // Если игра не опубликована, проверяем права доступа
        if (game.status !== 'published' && userId !== game.authorId) {
            throw new common_1.ForbiddenException('Нет доступа к этой игре');
        }
        return game;
    }
    async update(id, userId, updateGameDto) {
        const game = await this.findOne(id, userId);
        if (game.authorId !== userId) {
            throw new common_1.ForbiddenException('Нет прав на редактирование этой игры');
        }
        Object.assign(game, updateGameDto);
        return this.gamesRepository.save(game);
    }
    async publish(id, userId, publishGameDto) {
        const game = await this.findOne(id, userId);
        if (game.authorId !== userId) {
            throw new common_1.ForbiddenException('Нет прав на публикацию этой игры');
        }
        // Проверяем, что игра заполнена
        if (!game.categories || game.categories.length === 0) {
            throw new common_1.ForbiddenException('Нельзя опубликовать пустую игру');
        }
        for (const category of game.categories) {
            if (!category.questions || category.questions.length === 0) {
                throw new common_1.ForbiddenException('Все категории должны содержать вопросы');
            }
        }
        game.status = 'published';
        if (publishGameDto.title)
            game.title = publishGameDto.title;
        if (publishGameDto.description)
            game.description = publishGameDto.description;
        return this.gamesRepository.save(game);
    }
    async remove(id, userId) {
        const game = await this.findOne(id, userId);
        if (game.authorId !== userId) {
            throw new common_1.ForbiddenException('Нет прав на удаление этой игры');
        }
        await this.gamesRepository.remove(game);
    }
    async incrementPlays(id) {
        await this.gamesRepository.increment({ id }, 'plays', 1);
    }
};
exports.GamesService = GamesService;
exports.GamesService = GamesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(game_entity_1.Game)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(question_entity_1.Question)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], GamesService);
