import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  getSessionRetentionCutoffDate,
  SESSION_WITHIN_RETENTION_WHERE,
} from './session-retention.util';
import {
  Session,
  CrocodileState,
  CrocodileTermResult,
  TicTacToeState,
} from './entities/session.entity';
import { TicTacToeSetupDto } from './dto/tictactoe-setup.dto';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { GamesService } from '../games/games.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { AddTeamDto } from './dto/add-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

export interface QuizQuestionRef {
  categoryId: string;
  questionId: string;
}

export interface QuizRevealInfo extends QuizQuestionRef {
  index: number;
  questionText: string;
  correctAnswer: string;
  value: number;
}

const TICTACTOE_WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const TICTACTOE_QUESTION_COUNT = 9;

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(Player)
    private playersRepository: Repository<Player>,
    private gamesService: GamesService,
  ) {}

  private isMultiplayerSession(session: Session): boolean {
    if (session.multiplayer != null) {
      return session.multiplayer;
    }
    return session.game?.type === 'quiz';
  }

  
  private toClientSession(session: Session): Session {
    if (this.isMultiplayerSession(session)) {
      return session;
    }
    return { ...session, inviteCode: '' } as Session;
  }

  private async loadSessionById(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['game', 'game.categories', 'game.categories.questions', 'teams', 'teams.players'],
    });

    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }

    return session;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private shuffleArray<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private getCrocodileTerms(session: Session): Array<{ id: string; term: string }> {
    if (session.game?.type !== 'crocodile') return [];
    return (session.game.categories ?? []).flatMap((category) =>
      (category.questions ?? []).map((question) => ({
        id: question.id,
        term: question.question,
      })),
    );
  }

  private getCrocodileTimePerTerm(session: Session): number {
    return (
      session.settings?.timePerTerm ??
      session.game?.settings?.timePerTerm ??
      30
    );
  }

  private buildNextTurnEndsAt(session: Session): string {
    const ms = this.getCrocodileTimePerTerm(session) * 1000;
    return new Date(Date.now() + ms).toISOString();
  }

  private ensureCrocodileHost(session: Session, userId: string) {
    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может управлять "Крокодилом"');
    }
    if (session.game?.type !== 'crocodile') {
      throw new BadRequestException('Эта операция доступна только для "Крокодила"');
    }
  }

  private buildInitialCrocodileState(session: Session): CrocodileState {
    const terms = this.getCrocodileTerms(session);
    if (!terms.length) {
      throw new BadRequestException('В игре нет терминов для режима "Крокодил"');
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

  private applyCrocodileTermResult(
    session: Session,
    state: CrocodileState,
    result: CrocodileTermResult,
  ): CrocodileState {
    const currentTermId = state.currentTermId;
    if (!currentTermId) {
      throw new BadRequestException('В "Крокодиле" уже нет активных терминов');
    }

    const alreadyResolved = state.termResults.some((item) => item.termId === currentTermId);
    if (alreadyResolved) {
      throw new BadRequestException('Текущий термин уже обработан');
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

  private finalizeCrocodileIfCompleted(session: Session, state: CrocodileState) {
    if (!state.currentTermId && state.termResults.length >= state.termOrder.length) {
      session.status = 'finished';
      session.finishedAt = new Date();
    }
  }

  private getQuizQuestionRefs(session: Session): QuizQuestionRef[] {
    return session.game.categories.flatMap((category) =>
      category.questions.map((question) => ({
        categoryId: category.id,
        questionId: question.id,
      })),
    );
  }

  private hasUnansweredQuestions(session: Session, categoryId?: string): boolean {
    return session.game.categories.some((category) => {
      if (categoryId && category.id !== categoryId) {
        return false;
      }
      return category.questions.some(
        (question) =>
          !session.answeredQuestions.some(
            (answered) =>
              answered.categoryId === category.id &&
              answered.questionId === question.id &&
              !answered.userId,
          ),
      );
    });
  }

  private getQuizRevealInfo(
    session: Session,
    categoryId: string,
    questionId: string,
    index: number,
  ): QuizRevealInfo {
    const question = session.game.categories
      .flatMap((category) =>
        category.questions.map((item) => ({
          categoryId: category.id,
          question: item,
        })),
      )
      .find((x) => x.categoryId === categoryId && x.question.id === questionId)?.question;

    if (!question) {
      throw new NotFoundException('Вопрос не найден');
    }

    return {
      categoryId,
      questionId,
      index,
      questionText: question.question,
      correctAnswer: question.answer,
      value: question.value,
    };
  }

  private applyQuizReveal(session: Session, reveal: QuizRevealInfo): Session {
    const toScore = session.answeredQuestions.filter(
      (aq) =>
        aq.categoryId === reveal.categoryId &&
        aq.questionId === reveal.questionId &&
        aq.userId &&
        aq.isCorrect &&
        !aq.scored,
    );

    const updatedAnswered = session.answeredQuestions.map((aq) => {
      const matches =
        aq.categoryId === reveal.categoryId &&
        aq.questionId === reveal.questionId &&
        aq.userId &&
        aq.isCorrect;

      if (!matches || aq.scored) {
        return aq;
      }

      return { ...aq, scored: true };
    });

    for (const sub of toScore) {
      const team = session.teams.find((t) => t.id === sub.teamId);
      if (!team) continue;
      team.score += reveal.value;
    }

    session.answeredQuestions = updatedAnswered as Session['answeredQuestions'];

    const quizQuestions = this.getQuizQuestionRefs(session);
    const nextIndex = reveal.index + 1;
    if (nextIndex >= quizQuestions.length) {
      session.status = 'finished';
      session.finishedAt = new Date();
      session.questionStartedAt = null;
    } else {
      session.currentQuestionIndex = nextIndex;
      session.questionStartedAt = new Date();
    }

    return session;
  }

  async create(userId: string, createSessionDto: CreateSessionDto): Promise<Session> {
    const game = await this.gamesService.findOne(createSessionDto.gameId, userId);

    let inviteCode: string;
    let existingSession: Session | null;
    
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
      multiplayer: game.type === 'quiz',
      settings: {
        maxTeams: createSessionDto.settings?.maxTeams || 8,
        maxPlayersPerTeam: createSessionDto.settings?.maxPlayersPerTeam || 4,
        timePerQuestion:
          createSessionDto.settings?.timePerQuestion ??
          (game.settings?.timePerQuestion ?? 30),
        timePerTerm:
          createSessionDto.settings?.timePerTerm ??
          (game.settings?.timePerTerm ?? 30),
        allowNegativeScores:
          createSessionDto.settings?.allowNegativeScores ??
          (game.settings?.allowNegativeScores ?? game.type === 'own'),
      },
      teams: [],
      answeredQuestions: [],
      crocodileState: game.type === 'crocodile' ? null : undefined,
      tictactoeState: game.type === 'tictactoe' ? null : undefined,
    });

    const savedSession = await this.sessionsRepository.save(session);
    await this.gamesService.incrementPlays(game.id);
    return savedSession;
  }

  async join(userId: string, joinSessionDto: JoinSessionDto): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { inviteCode: joinSessionDto.inviteCode },
      relations: ['game', 'teams', 'teams.players'],
    });

    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }

    if (session.status !== 'waiting') {
      throw new BadRequestException('Нельзя присоединиться к уже начатой игре');
    }

    if (
      session.game?.type === 'crocodile' ||
      session.game?.type === 'wheel' ||
      session.game?.type === 'station' ||
      session.game?.type === 'tictactoe'
    ) {
      throw new ForbiddenException(
        'Эта игровая сессия запускается только локально у преподавателя',
      );
    }

    if (!this.isMultiplayerSession(session) && session.hostId !== userId) {
      throw new ForbiddenException(
        'К этой игровой сессии нельзя присоединиться по коду: она предназначена только для локального проведения у преподавателя',
      );
    }

    if (session.game?.type === 'own' && session.hostId === userId) {
      const alreadyInSession = session.teams.some((t) =>
        t.players?.some((p) => p.userId === userId),
      );
      if (alreadyInSession) {
        throw new BadRequestException('Организатор уже участвует в этой сессии');
      }
    }

    const requestedTeamName = joinSessionDto.teamName?.trim()
      ? joinSessionDto.teamName.trim()
      : undefined;
    let team = requestedTeamName ? session.teams.find((t) => t.name === requestedTeamName) : undefined;
    
    if (!team) {
      if (session.teams.length >= session.settings.maxTeams) {
        throw new BadRequestException('Достигнуто максимальное количество команд');
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
      throw new BadRequestException('В команде достигнуто максимальное количество игроков');
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

  async findOne(id: string): Promise<Session> {
    const session = await this.loadSessionById(id);
    return this.toClientSession(session);
  }

  async findByUser(userId: string): Promise<Session[]> {
    const cutoff = getSessionRetentionCutoffDate();
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.game', 'game')
      .leftJoinAndSelect('session.teams', 'teams')
      .leftJoin('teams.players', 'player')
      .where(
        new Brackets((qb) => {
          qb.where('session.hostId = :hostUserId', { hostUserId: userId }).orWhere(
            'player.userId = :playerUserId',
            { playerUserId: userId },
          );
        }),
      )
      .andWhere(SESSION_WITHIN_RETENTION_WHERE, { cutoff })
      .distinct(true)
      .orderBy('session.createdAt', 'DESC')
      .getMany();
    return sessions.map((s) => this.toClientSession(s));
  }

  async start(id: string, userId: string): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может начать игру');
    }

    if (session.status !== 'waiting') {
      throw new BadRequestException('Игра уже начата');
    }

    session.status = 'active';
    session.startedAt = new Date();

    if (session.game?.type === 'crocodile') {
      session.crocodileState = this.buildInitialCrocodileState(session);
    } else {
      session.currentQuestionIndex = 0;
      session.questionStartedAt = session.game?.type === 'quiz' ? new Date() : null;
    }

    const saved = await this.sessionsRepository.save(session);
    return this.toClientSession(saved);
  }

  async markCrocodileTerm(
    id: string,
    userId: string,
    result: CrocodileTermResult,
    termId?: string,
  ): Promise<Session> {
    const session = await this.loadSessionById(id);
    this.ensureCrocodileHost(session, userId);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    const state = session.crocodileState;
    if (!state) {
      throw new BadRequestException('Состояние "Крокодила" не инициализировано');
    }

    if (termId && state.currentTermId !== termId) {
      throw new BadRequestException('Текущий термин уже изменился, обновите страницу');
    }

    const updatedState = this.applyCrocodileTermResult(session, state, result);
    session.crocodileState = updatedState;
    this.finalizeCrocodileIfCompleted(session, updatedState);

    const saved = await this.sessionsRepository.save(session);
    return this.toClientSession(saved);
  }

  async answerQuestion(
    id: string,
    userId: string,
    categoryId: string,
    questionId: string,
    submitDto?: SubmitAnswerDto,
  ): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    if (session.game?.type === 'quiz') {
      const player = session.teams
        .flatMap((t) => t.players)
        .find((p) => p.userId === userId);

      if (!player) {
        throw new BadRequestException('Пользователь не состоит в этой сессии');
      }

      const isAlreadySubmitted = session.answeredQuestions.some(
        (aq) => aq.categoryId === categoryId && aq.questionId === questionId && aq.userId === userId,
      );

      if (isAlreadySubmitted) {
        throw new BadRequestException('Вы уже отвечали на этот вопрос');
      }

      const question = session.game.categories
        .flatMap((c) => c.questions.map((q) => ({ categoryId: c.id, category: c, question: q })))
        .find((x) => x.categoryId === categoryId && x.question.id === questionId)?.question;

      if (!question) {
        throw new NotFoundException('Вопрос не найден');
      }

      const quizQuestions = this.getQuizQuestionRefs(session);
      const currentIndex = session.currentQuestionIndex ?? 0;
      const current = quizQuestions[currentIndex];
      if (!current || current.categoryId !== categoryId || current.questionId !== questionId) {
        throw new BadRequestException('Ответ можно отправлять только на текущий вопрос');
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

      const saved = await this.sessionsRepository.save(session);
      return this.toClientSession(saved);
    }

    const questionExists = session.game.categories.some(
      (category) =>
        category.id === categoryId && category.questions.some((question) => question.id === questionId),
    );
    if (!questionExists) {
      throw new NotFoundException('Вопрос не найден');
    }

    const isAnswered = session.answeredQuestions.some(
      (aq) => aq.categoryId === categoryId && aq.questionId === questionId && !aq.userId,
    );

    if (isAnswered) {
      throw new BadRequestException('На этот вопрос уже отвечали');
    }

    session.answeredQuestions.push({ categoryId, questionId });

    if (session.game?.type === 'wheel' && !this.hasUnansweredQuestions(session)) {
      session.status = 'finished';
      session.finishedAt = new Date();
      session.questionStartedAt = null;
      await this.gamesService.incrementPlays(session.gameId);
    }

    const savedOwn = await this.sessionsRepository.save(session);
    return this.toClientSession(savedOwn);
  }

  async revealQuizQuestion(
    id: string,
    userId: string,
    categoryId: string,
    questionId: string,
  ): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    if (session.game?.type !== 'quiz') {
      throw new BadRequestException('Режим викторины не активен');
    }

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может раскрывать ответы');
    }

    const quizQuestions = this.getQuizQuestionRefs(session);
    const currentIndex = session.currentQuestionIndex ?? 0;
    const current = quizQuestions[currentIndex];
    if (!current || current.categoryId !== categoryId || current.questionId !== questionId) {
      throw new BadRequestException('Можно раскрывать только текущий вопрос');
    }

    const reveal = this.getQuizRevealInfo(session, categoryId, questionId, currentIndex);
    this.applyQuizReveal(session, reveal);

    const savedReveal = await this.sessionsRepository.save(session);
    return this.toClientSession(savedReveal);
  }

  async revealQuizQuestionByTimer(
    id: string,
    expectedQuestionIndex: number,
  ): Promise<{ session: Session; reveal: QuizRevealInfo } | null> {
    const session = await this.loadSessionById(id);
    if (session.status !== 'active' || session.game?.type !== 'quiz') {
      return null;
    }

    const currentIndex = session.currentQuestionIndex ?? 0;
    if (currentIndex !== expectedQuestionIndex) {
      return null;
    }

    const current = this.getQuizQuestionRefs(session)[currentIndex];
    if (!current) {
      return null;
    }

    const reveal = this.getQuizRevealInfo(
      session,
      current.categoryId,
      current.questionId,
      currentIndex,
    );
    this.applyQuizReveal(session, reveal);
    const saved = await this.sessionsRepository.save(session);
    return { session: this.toClientSession(saved), reveal };
  }

  async getQuizRevealInfoForCurrentQuestion(id: string): Promise<QuizRevealInfo | null> {
    const session = await this.loadSessionById(id);
    if (session.status !== 'active' || session.game?.type !== 'quiz') {
      return null;
    }

    const currentIndex = session.currentQuestionIndex ?? 0;
    const current = this.getQuizQuestionRefs(session)[currentIndex];
    if (!current) {
      return null;
    }

    return this.getQuizRevealInfo(
      session,
      current.categoryId,
      current.questionId,
      currentIndex,
    );
  }

  async updateScore(id: string, userId: string, updateScoreDto: UpdateScoreDto): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может изменять счет');
    }

    const team = session.teams.find(t => t.id === updateScoreDto.teamId);
    if (!team) {
      throw new NotFoundException('Команда не найдена');
    }

    if (session.game?.type === 'wheel' && updateScoreDto.points !== 1) {
      throw new BadRequestException('Для "Колеса Фортуны" за верный ответ можно начислить только 1 балл');
    }

    team.score += updateScoreDto.points;
    await this.teamsRepository.save(team);

    return this.findOne(id);
  }

  async finish(id: string, userId: string): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может завершить игру');
    }

    if (session.status === 'finished') {
      return this.toClientSession(session);
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
    session.questionStartedAt = null;

    await this.gamesService.incrementPlays(session.gameId);

    const savedFinish = await this.sessionsRepository.save(session);
    return this.toClientSession(savedFinish);
  }

  async updateTeam(
    id: string,
    teamId: string,
    userId: string,
    dto: UpdateTeamDto,
  ): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.status !== 'waiting') {
      throw new BadRequestException('Название команды можно изменить только до старта игры');
    }

    if (session.game?.type !== 'quiz') {
      throw new BadRequestException('Переименование команд доступно только для викторины');
    }

    const team = session.teams.find((t) => t.id === teamId);
    if (!team) {
      throw new NotFoundException('Команда не найдена');
    }

    const isHost = session.hostId === userId;
    const isTeamMember = team.players?.some((p) => p.userId === userId);
    if (!isHost && !isTeamMember) {
      throw new ForbiddenException('Нет прав на изменение этой команды');
    }

    const name = dto.name.trim();
    const duplicate = session.teams.some((t) => t.id !== teamId && t.name === name);
    if (duplicate) {
      throw new BadRequestException('Команда с таким названием уже существует');
    }

    team.name = name;
    await this.teamsRepository.save(team);

    return this.findOne(session.id);
  }

  async addTeam(id: string, userId: string, dto: AddTeamDto): Promise<Session> {
    const session = await this.loadSessionById(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может добавлять команды');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('Команды можно добавлять только после старта');
    }

    if (session.game?.type !== 'own') {
      throw new BadRequestException('Добавление команд поддерживается только для "своей игры"');
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

  async remove(id: string, userId: string): Promise<void> {
    const session = await this.loadSessionById(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может удалять сессии');
    }

    await this.sessionsRepository.remove(session);
  }

  private ensureTicTacToeHost(session: Session, userId: string) {
    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может управлять игрой');
    }
    if (session.game?.type !== 'tictactoe') {
      throw new BadRequestException('Эта операция доступна только для "Крестики-нолики"');
    }
  }

  private getTicTacToeQuestionIds(session: Session): string[] {
    const ids = (session.game?.categories ?? []).flatMap((category) =>
      (category.questions ?? []).map((q) => q.id),
    );
    return ids;
  }

  private buildTicTacToeCells(questionIds: string[]): TicTacToeState['cells'] {
    const shuffled = this.shuffleArray(questionIds);
    return shuffled.map((questionId, index) => ({
      index,
      questionId,
      occupiedByTeamId: null,
    }));
  }

  private checkTicTacToeWinner(
    cells: TicTacToeState['cells'],
    teamId: string,
  ): boolean {
    return TICTACTOE_WIN_LINES.some((line) =>
      line.every((idx) => cells[idx].occupiedByTeamId === teamId),
    );
  }

  private getOtherTeamId(state: TicTacToeState, teamId: string): string {
    return state.team1Id === teamId ? state.team2Id : state.team1Id;
  }

  private reshuffleEmptyTicTacToeCells(state: TicTacToeState): TicTacToeState['cells'] {
    const emptyIndices = state.cells
      .filter((cell) => cell.occupiedByTeamId === null)
      .map((cell) => cell.index);
    const questionIds = emptyIndices.map((idx) => state.cells[idx].questionId);
    const shuffled = this.shuffleArray(questionIds);
    const nextCells = state.cells.map((cell) => ({ ...cell }));
    emptyIndices.forEach((cellIndex, i) => {
      nextCells[cellIndex] = {
        ...nextCells[cellIndex],
        questionId: shuffled[i],
      };
    });
    return nextCells;
  }

  async setupTicTacToe(id: string, userId: string, dto: TicTacToeSetupDto): Promise<Session> {
    const session = await this.loadSessionById(id);
    this.ensureTicTacToeHost(session, userId);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра должна быть активна');
    }

    if (session.tictactoeState?.setupComplete) {
      throw new BadRequestException('Настройка команд уже выполнена');
    }

    if (dto.team1Symbol === dto.team2Symbol) {
      throw new BadRequestException('Команды должны выбрать разные символы');
    }

    const questionIds = this.getTicTacToeQuestionIds(session);
    if (questionIds.length !== TICTACTOE_QUESTION_COUNT) {
      throw new BadRequestException(
        `Игра должна содержать ровно ${TICTACTOE_QUESTION_COUNT} вопросов`,
      );
    }

    const team1 = await this.teamsRepository.save(
      this.teamsRepository.create({
        name: dto.team1Name.trim(),
        sessionId: session.id,
        score: 0,
        players: [],
      }),
    );

    const team2 = await this.teamsRepository.save(
      this.teamsRepository.create({
        name: dto.team2Name.trim(),
        sessionId: session.id,
        score: 0,
        players: [],
      }),
    );

    session.teams = [team1, team2];
    session.tictactoeState = {
      setupComplete: true,
      team1Id: team1.id,
      team2Id: team2.id,
      team1Symbol: dto.team1Symbol,
      team2Symbol: dto.team2Symbol,
      currentTurnTeamId: team1.id,
      cells: this.buildTicTacToeCells(questionIds),
      removedQuestionIds: [],
      selectedCellIndex: null,
      winnerTeamId: null,
    };

    const saved = await this.sessionsRepository.save(session);
    return this.toClientSession(saved);
  }

  async openTicTacToeCell(id: string, userId: string, cellIndex: number): Promise<Session> {
    const session = await this.loadSessionById(id);
    this.ensureTicTacToeHost(session, userId);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    const state = session.tictactoeState;
    if (!state?.setupComplete) {
      throw new BadRequestException('Сначала настройте команды');
    }

    if (state.winnerTeamId) {
      throw new BadRequestException('Игра уже завершена');
    }

    if (state.selectedCellIndex !== null) {
      throw new BadRequestException('Сначала ответьте на открытый вопрос');
    }

    const cell = state.cells[cellIndex];
    if (!cell || cell.occupiedByTeamId !== null) {
      throw new BadRequestException('Клетка уже занята');
    }

    session.tictactoeState = {
      ...state,
      selectedCellIndex: cellIndex,
    };

    const saved = await this.sessionsRepository.save(session);
    return this.toClientSession(saved);
  }

  async answerTicTacToe(id: string, userId: string, correct: boolean): Promise<Session> {
    const session = await this.loadSessionById(id);
    this.ensureTicTacToeHost(session, userId);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    const state = session.tictactoeState;
    if (!state?.setupComplete) {
      throw new BadRequestException('Сначала настройте команды');
    }

    if (state.winnerTeamId) {
      throw new BadRequestException('Игра уже завершена');
    }

    if (state.selectedCellIndex === null) {
      throw new BadRequestException('Сначала выберите клетку');
    }

    const cellIndex = state.selectedCellIndex;
    const cell = state.cells[cellIndex];
    if (!cell || cell.occupiedByTeamId !== null) {
      throw new BadRequestException('Клетка уже занята');
    }

    let nextCells = state.cells.map((c) => ({ ...c }));
    let removedQuestionIds = [...state.removedQuestionIds];
    let winnerTeamId: string | null = null;

    if (correct) {
      nextCells[cellIndex] = {
        ...nextCells[cellIndex],
        occupiedByTeamId: state.currentTurnTeamId,
      };
      if (!removedQuestionIds.includes(cell.questionId)) {
        removedQuestionIds.push(cell.questionId);
      }
      if (this.checkTicTacToeWinner(nextCells, state.currentTurnTeamId)) {
        winnerTeamId = state.currentTurnTeamId;
      }
    } else {
      nextCells = this.reshuffleEmptyTicTacToeCells({
        ...state,
        cells: nextCells,
      });
    }

    const allOccupied = nextCells.every((c) => c.occupiedByTeamId !== null);
    const isDraw = allOccupied && !winnerTeamId;

    const nextState: TicTacToeState = {
      ...state,
      cells: nextCells,
      removedQuestionIds,
      selectedCellIndex: null,
      currentTurnTeamId: this.getOtherTeamId(state, state.currentTurnTeamId),
      winnerTeamId,
      isDraw,
    };

    session.tictactoeState = nextState;

    if (winnerTeamId || isDraw) {
      session.status = 'finished';
      session.finishedAt = new Date();
    }

    const saved = await this.sessionsRepository.save(session);
    return this.toClientSession(saved);
  }
}