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
exports.SessionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const session_entity_1 = require("./entities/session.entity");
const team_entity_1 = require("./entities/team.entity");
const player_entity_1 = require("./entities/player.entity");
const games_service_1 = require("../games/games.service");
let SessionsService = class SessionsService {
    constructor(sessionsRepository, teamsRepository, playersRepository, gamesService) {
        this.sessionsRepository = sessionsRepository;
        this.teamsRepository = teamsRepository;
        this.playersRepository = playersRepository;
        this.gamesService = gamesService;
    }
    generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    shuffleArray(items) {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    getCrocodileTerms(session) {
        if (session.game?.type !== 'crocodile')
            return [];
        return (session.game.categories ?? []).flatMap((category) => (category.questions ?? []).map((question) => ({
            id: question.id,
            term: question.question,
        })));
    }
    getCrocodileTimePerTerm(session) {
        return (session.settings?.timePerTerm ??
            session.game?.settings?.timePerTerm ??
            30);
    }
    buildNextTurnEndsAt(session) {
        const ms = this.getCrocodileTimePerTerm(session) * 1000;
        return new Date(Date.now() + ms).toISOString();
    }
    ensureCrocodileHost(session, userId) {
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может управлять "Крокодилом"');
        }
        if (session.game?.type !== 'crocodile') {
            throw new common_1.BadRequestException('Эта операция доступна только для "Крокодила"');
        }
    }
    buildInitialCrocodileState(session) {
        const terms = this.getCrocodileTerms(session);
        if (!terms.length) {
            throw new common_1.BadRequestException('В игре нет терминов для режима "Крокодил"');
        }
        const termOrder = this.shuffleArray(terms.map((term) => term.id));
        const firstTermId = termOrder[0] ?? null;
        return {
            termOrder,
            currentTermId: firstTermId,
            turnEndsAt: firstTermId ? this.buildNextTurnEndsAt(session) : null,
            termResults: [],
        };
    }
    applyCrocodileTermResult(session, state, result) {
        const currentTermId = state.currentTermId;
        if (!currentTermId) {
            throw new common_1.BadRequestException('В "Крокодиле" уже нет активных терминов');
        }
        const alreadyResolved = state.termResults.some((item) => item.termId === currentTermId);
        if (alreadyResolved) {
            throw new common_1.BadRequestException('Текущий термин уже обработан');
        }
        const termResults = [...state.termResults, { termId: currentTermId, result }];
        const nextTermId = state.termOrder[termResults.length] ?? null;
        return {
            ...state,
            currentTermId: nextTermId,
            turnEndsAt: nextTermId ? this.buildNextTurnEndsAt(session) : null,
            termResults,
        };
    }
    finalizeCrocodileIfCompleted(session, state) {
        if (!state.currentTermId && state.termResults.length >= state.termOrder.length) {
            session.status = 'finished';
            session.finishedAt = new Date();
        }
    }
    async create(userId, createSessionDto) {
        const game = await this.gamesService.findOne(createSessionDto.gameId, userId);
        
        let inviteCode;
        let existingSession;
        do {
            inviteCode = this.generateInviteCode();
            existingSession = await this.sessionsRepository.findOne({
                where: { inviteCode },
            });
        } while (existingSession);
        const session = this.sessionsRepository.create({
            gameId: game.id,
            hostId: userId,
            inviteCode,
            settings: {
                maxTeams: createSessionDto.settings?.maxTeams || 8,
                maxPlayersPerTeam: createSessionDto.settings?.maxPlayersPerTeam || 4,
                
                timePerQuestion: createSessionDto.settings?.timePerQuestion ??
                    (game.settings?.timePerQuestion ?? 30),
                timePerTerm: createSessionDto.settings?.timePerTerm ??
                    (game.settings?.timePerTerm ?? 30),
                allowNegativeScores: createSessionDto.settings?.allowNegativeScores ??
                    (game.settings?.allowNegativeScores ?? false),
            },
            teams: [],
            answeredQuestions: [],
            crocodileState: game.type === 'crocodile' ? null : undefined,
        });
        return this.sessionsRepository.save(session);
    }
    async join(userId, joinSessionDto) {
        const session = await this.sessionsRepository.findOne({
            where: { inviteCode: joinSessionDto.inviteCode },
            relations: ['game', 'teams', 'teams.players'],
        });
        if (!session) {
            throw new common_1.NotFoundException('Сессия не найдена');
        }
        if (session.status !== 'waiting') {
            throw new common_1.BadRequestException('Нельзя присоединиться к уже начатой игре');
        }
        if (session.game?.type === 'crocodile') {
            throw new common_1.ForbiddenException('Сессия "Крокодил" запускается только локально у преподавателя');
        }
        
        if (session.game?.type === 'own') {
            if (session.hostId !== userId) {
                throw new common_1.ForbiddenException('В "своей игре" присоединяться по коду может только организатор');
            }
            const alreadyInSession = session.teams.some((t) => t.players?.some((p) => p.userId === userId));
            if (alreadyInSession) {
                throw new common_1.BadRequestException('Организатор уже участвует в этой сессии');
            }
        }
        
        const requestedTeamName = joinSessionDto.teamName?.trim()
            ? joinSessionDto.teamName.trim()
            : undefined;
        let team = requestedTeamName ? session.teams.find((t) => t.name === requestedTeamName) : undefined;
        if (!team) {
            if (session.teams.length >= session.settings.maxTeams) {
                throw new common_1.BadRequestException('Достигнуто максимальное количество команд');
            }
            team = this.teamsRepository.create({
                
                name: requestedTeamName ?? `Команда ${session.teams.length + 1}`,
                sessionId: session.id,
                players: [],
            });
            team = await this.teamsRepository.save(team);
            session.teams.push(team);
        }
        if (team.players.length >= session.settings.maxPlayersPerTeam) {
            throw new common_1.BadRequestException('В команде достигнуто максимальное количество игроков');
        }
        const player = this.playersRepository.create({
            name: joinSessionDto.playerName,
            teamId: team.id,
            isHost: session.teams.length === 0 && team.players.length === 0,
            userId,
        });
        await this.playersRepository.save(player);
        return this.findOne(session.id);
    }
    async findOne(id) {
        const session = await this.sessionsRepository.findOne({
            where: { id },
            relations: ['game', 'game.categories', 'game.categories.questions', 'teams', 'teams.players'],
        });
        if (!session) {
            throw new common_1.NotFoundException('Сессия не найдена');
        }
        return session;
    }
    async findByUser(userId) {
        return this.sessionsRepository.find({
            where: [
                { hostId: userId },
                { teams: { players: { userId } } },
            ],
            relations: ['game', 'teams'],
            order: { createdAt: 'DESC' },
        });
    }
    async start(id, userId) {
        const session = await this.findOne(id);
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может начать игру');
        }
        if (session.status !== 'waiting') {
            throw new common_1.BadRequestException('Игра уже начата');
        }
        session.status = 'active';
        session.startedAt = new Date();
        if (session.game?.type === 'crocodile') {
            session.crocodileState = this.buildInitialCrocodileState(session);
        }
        else {
            session.currentQuestionIndex = 0;
        }
        return this.sessionsRepository.save(session);
    }
    async markCrocodileTerm(id, userId, result, termId) {
        const session = await this.findOne(id);
        this.ensureCrocodileHost(session, userId);
        if (session.status !== 'active') {
            throw new common_1.BadRequestException('Игра не активна');
        }
        const state = session.crocodileState;
        if (!state) {
            throw new common_1.BadRequestException('Состояние "Крокодила" не инициализировано');
        }
        if (termId && state.currentTermId !== termId) {
            throw new common_1.BadRequestException('Текущий термин уже изменился, обновите страницу');
        }
        const updatedState = this.applyCrocodileTermResult(session, state, result);
        session.crocodileState = updatedState;
        this.finalizeCrocodileIfCompleted(session, updatedState);
        return this.sessionsRepository.save(session);
    }
    async answerQuestion(id, userId, categoryId, questionId, submitDto) {
        const session = await this.findOne(id);
        if (session.status !== 'active') {
            throw new common_1.BadRequestException('Игра не активна');
        }
        if (session.game?.type === 'quiz') {
            const player = session.teams
                .flatMap((t) => t.players)
                .find((p) => p.userId === userId);
            if (!player) {
                throw new common_1.BadRequestException('Пользователь не состоит в этой сессии');
            }
            const isAlreadySubmitted = session.answeredQuestions.some((aq) => aq.categoryId === categoryId && aq.questionId === questionId && aq.userId === userId);
            if (isAlreadySubmitted) {
                throw new common_1.BadRequestException('Вы уже отвечали на этот вопрос');
            }
            const question = session.game.categories
                .flatMap((c) => c.questions.map((q) => ({ categoryId: c.id, category: c, question: q })))
                .find((x) => x.categoryId === categoryId && x.question.id === questionId)?.question;
            if (!question) {
                throw new common_1.NotFoundException('Вопрос не найден');
            }
            const quizQuestions = session.game.categories.flatMap((c) => c.questions.map((q) => ({
                categoryId: c.id,
                questionId: q.id,
            })));
            const currentIndex = session.currentQuestionIndex ?? 0;
            const current = quizQuestions[currentIndex];
            if (!current || current.categoryId !== categoryId || current.questionId !== questionId) {
                throw new common_1.BadRequestException('Ответ можно отправлять только на текущий вопрос');
            }
            const answerText = (submitDto?.answer ?? '').trim().toLowerCase();
            const correctText = (question.answer ?? '').trim().toLowerCase();
            const isCorrect = answerText.length > 0 && answerText === correctText;
            session.answeredQuestions.push({
                categoryId,
                questionId,
                userId,
                teamId: player.teamId,
                isCorrect,
                submittedAnswer: submitDto?.answer ?? '',
                scored: false,
            });
            return this.sessionsRepository.save(session);
        }
        const isAnswered = session.answeredQuestions.some((aq) => aq.categoryId === categoryId && aq.questionId === questionId && !aq.userId);
        if (isAnswered) {
            throw new common_1.BadRequestException('На этот вопрос уже отвечали');
        }
        session.answeredQuestions.push({ categoryId, questionId });
        return this.sessionsRepository.save(session);
    }
    async revealQuizQuestion(id, categoryId, questionId) {
        const session = await this.findOne(id);
        if (session.status !== 'active') {
            throw new common_1.BadRequestException('Игра не активна');
        }
        if (session.game?.type !== 'quiz') {
            throw new common_1.BadRequestException('Режим викторины не активен');
        }
        const quizQuestions = session.game.categories.flatMap((c) => c.questions.map((q) => ({
            categoryId: c.id,
            questionId: q.id,
        })));
        const currentIndex = session.currentQuestionIndex ?? 0;
        const current = quizQuestions[currentIndex];
        if (!current || current.categoryId !== categoryId || current.questionId !== questionId) {
            throw new common_1.BadRequestException('Можно раскрывать только текущий вопрос');
        }
        const question = session.game.categories
            .flatMap((c) => c.questions.map((q) => ({ categoryId: c.id, question: q })))
            .find((x) => x.categoryId === categoryId && x.question.id === questionId)?.question;
        if (!question) {
            throw new common_1.NotFoundException('Вопрос не найден');
        }
        const toScore = session.answeredQuestions.filter((aq) => aq.categoryId === categoryId &&
            aq.questionId === questionId &&
            aq.userId &&
            aq.isCorrect &&
            !aq.scored);
        const updatedAnswered = session.answeredQuestions.map((aq) => {
            const matches = aq.categoryId === categoryId &&
                aq.questionId === questionId &&
                aq.userId &&
                aq.isCorrect;
            if (!matches)
                return aq;
            if (aq.scored)
                return aq;
            return { ...aq, scored: true };
        });
        for (const sub of toScore) {
            const team = session.teams.find((t) => t.id === sub.teamId);
            if (!team)
                continue;
            team.score += question.value;
        }
        session.answeredQuestions = updatedAnswered;
        const total = quizQuestions.length;
        const nextIndex = currentIndex + 1;
        if (nextIndex >= total) {
            session.status = 'finished';
            session.finishedAt = new Date();
        }
        else {
            session.currentQuestionIndex = nextIndex;
        }
        return this.sessionsRepository.save(session);
    }
    async updateScore(id, userId, updateScoreDto) {
        const session = await this.findOne(id);
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может изменять счет');
        }
        const team = session.teams.find(t => t.id === updateScoreDto.teamId);
        if (!team) {
            throw new common_1.NotFoundException('Команда не найдена');
        }
        team.score += updateScoreDto.points;
        await this.teamsRepository.save(team);
        return this.findOne(id);
    }
    async finish(id, userId) {
        const session = await this.findOne(id);
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может завершить игру');
        }
        if (session.status === 'finished') {
            return session;
        }
        if (session.game?.type === 'crocodile' && session.crocodileState) {
            let state = session.crocodileState;
            while (state.currentTermId) {
                state = this.applyCrocodileTermResult(session, state, 'missed');
            }
            session.crocodileState = state;
        }
        session.status = 'finished';
        session.finishedAt = new Date();
        await this.gamesService.incrementPlays(session.gameId);
        return this.sessionsRepository.save(session);
    }
    async addTeam(id, userId, dto) {
        const session = await this.findOne(id);
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может добавлять команды');
        }
        if (session.status !== 'active') {
            throw new common_1.BadRequestException('Команды можно добавлять только после старта');
        }
        if (session.game?.type !== 'own') {
            throw new common_1.BadRequestException('Добавление команд поддерживается только для "своей игры"');
        }
        const name = dto.name?.trim() ? dto.name.trim() : `Команда ${session.teams.length + 1}`;
        const team = this.teamsRepository.create({
            name,
            sessionId: session.id,
            players: [],
            score: 0,
        });
        await this.teamsRepository.save(team);
        return this.findOne(session.id);
    }
    async remove(id, userId) {
        const session = await this.findOne(id);
        if (session.hostId !== userId) {
            throw new common_1.ForbiddenException('Только создатель может удалять сессии');
        }
        await this.sessionsRepository.remove(session);
    }
};
exports.SessionsService = SessionsService;
exports.SessionsService = SessionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(session_entity_1.Session)),
    __param(1, (0, typeorm_1.InjectRepository)(team_entity_1.Team)),
    __param(2, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        games_service_1.GamesService])
], SessionsService);
