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
exports.SessionsController = void 0;
const common_1 = require("@nestjs/common");
const sessions_service_1 = require("./sessions.service");
const create_session_dto_1 = require("./dto/create-session.dto");
const join_session_dto_1 = require("./dto/join-session.dto");
const submit_answer_dto_1 = require("./dto/submit-answer.dto");
const update_score_dto_1 = require("./dto/update-score.dto");
const add_team_dto_1 = require("./dto/add-team.dto");
const mark_crocodile_term_dto_1 = require("./dto/mark-crocodile-term.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_entity_1 = require("../users/entities/user.entity");
let SessionsController = class SessionsController {
    constructor(sessionsService) {
        this.sessionsService = sessionsService;
    }
    create(user, createSessionDto) {
        return this.sessionsService.create(user.id, createSessionDto);
    }
    join(user, joinSessionDto) {
        return this.sessionsService.join(user.id, joinSessionDto);
    }
    findAll(user) {
        return this.sessionsService.findByUser(user.id);
    }
    findOne(id) {
        return this.sessionsService.findOne(id);
    }
    start(id, user) {
        return this.sessionsService.start(id, user.id);
    }
    answerQuestion(id, categoryId, questionId, user, submitDto) {
        return this.sessionsService.answerQuestion(id, user.id, categoryId, questionId, submitDto);
    }
    revealQuizQuestion(id, categoryId, questionId, _user) {
        return this.sessionsService.revealQuizQuestion(id, categoryId, questionId);
    }
    updateScore(id, user, updateScoreDto) {
        return this.sessionsService.updateScore(id, user.id, updateScoreDto);
    }
    finish(id, user) {
        return this.sessionsService.finish(id, user.id);
    }
    markCrocodileGuessed(id, user, dto) {
        return this.sessionsService.markCrocodileTerm(id, user.id, 'guessed', dto.termId);
    }
    markCrocodileMissed(id, user, dto) {
        return this.sessionsService.markCrocodileTerm(id, user.id, 'missed', dto.termId);
    }
    addTeam(id, user, dto) {
        return this.sessionsService.addTeam(id, user.id, dto);
    }
    remove(id, user) {
        return this.sessionsService.remove(id, user.id);
    }
};
exports.SessionsController = SessionsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, create_session_dto_1.CreateSessionDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('join'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, join_session_dto_1.JoinSessionDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "join", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/answer/:categoryId/:questionId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Param)('questionId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, user_entity_1.User,
        submit_answer_dto_1.SubmitAnswerDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "answerQuestion", null);
__decorate([
    (0, common_1.Post)(':id/quiz/reveal/:categoryId/:questionId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('categoryId')),
    __param(2, (0, common_1.Param)('questionId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "revealQuizQuestion", null);
__decorate([
    (0, common_1.Post)(':id/score'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        update_score_dto_1.UpdateScoreDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "updateScore", null);
__decorate([
    (0, common_1.Post)(':id/finish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "finish", null);
__decorate([
    (0, common_1.Post)(':id/crocodile/guess'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        mark_crocodile_term_dto_1.MarkCrocodileTermDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "markCrocodileGuessed", null);
__decorate([
    (0, common_1.Post)(':id/crocodile/miss'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        mark_crocodile_term_dto_1.MarkCrocodileTermDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "markCrocodileMissed", null);
__decorate([
    (0, common_1.Post)(':id/teams'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User,
        add_team_dto_1.AddTeamDto]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "addTeam", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SessionsController.prototype, "remove", null);
exports.SessionsController = SessionsController = __decorate([
    (0, common_1.Controller)('sessions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sessions_service_1.SessionsService])
], SessionsController);
