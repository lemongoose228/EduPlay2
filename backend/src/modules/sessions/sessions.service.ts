import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, CrocodileState, CrocodileTermResult } from './entities/session.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { GamesService } from '../games/games.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { AddTeamDto } from './dto/add-team.dto';

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
          (game.settings?.allowNegativeScores ?? false),
      },
      teams: [],
      answeredQuestions: [],
      crocodileState: game.type === 'crocodile' ? null : undefined,
    });

    return this.sessionsRepository.save(session);
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

    if (session.game?.type === 'crocodile') {
      throw new ForbiddenException('Сессия "Крокодил" запускается только локально у преподавателя');
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
    const sessions = await this.sessionsRepository.find({
      where: [
        { hostId: userId },
        { teams: { players: { userId } } },
      ],
      relations: ['game', 'teams'],
      order: { createdAt: 'DESC' },
    });
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
      session.questionStartedAt = new Date();
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

    const isAnswered = session.answeredQuestions.some(
      (aq) => aq.categoryId === categoryId && aq.questionId === questionId && !aq.userId,
    );

    if (isAnswered) {
      throw new BadRequestException('На этот вопрос уже отвечали');
    }

    session.answeredQuestions.push({ categoryId, questionId });

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
}