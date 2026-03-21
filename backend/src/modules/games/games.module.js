"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const games_service_1 = require("./games.service");
const games_controller_1 = require("./games.controller");
const game_entity_1 = require("./entities/game.entity");
const game_like_entity_1 = require("./entities/game-like.entity");
const category_entity_1 = require("./entities/category.entity");
const question_entity_1 = require("./entities/question.entity");
const session_entity_1 = require("../sessions/entities/session.entity");
let GamesModule = class GamesModule {
};
exports.GamesModule = GamesModule;
exports.GamesModule = GamesModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([game_entity_1.Game, game_like_entity_1.GameLike, category_entity_1.Category, question_entity_1.Question, session_entity_1.Session])],
        controllers: [games_controller_1.GamesController],
        providers: [games_service_1.GamesService],
        exports: [games_service_1.GamesService],
    })
], GamesModule);
