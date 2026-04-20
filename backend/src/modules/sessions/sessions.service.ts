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

  async create(userId: string, createSessionDto: CreateSessionDto): Promise<Session> {
    const game = await this.gamesService.findOne(createSessionDto.gameId, userId);

    // Сессии можно создавать для любых игр, к которым есть доступ (в т.ч. черновики автора)
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
      settings: {
        maxTeams: createSessionDto.settings?.maxTeams || 8,
        maxPlayersPerTeam: createSessionDto.settings?.maxPlayersPerTeam || 4,
        // Берем настройки из игры (для викторины важно), но приоритет у параметров сессии.
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

    // Для "своей игры" участником может быть только организатор (1 игрок).
    if (session.game?.type === 'own') {
      if (session.hostId !== userId) {
        throw new ForbiddenException('В "своей игре" присоединяться по коду может только организатор');
      }

      const alreadyInSession = session.teams.some((t) =>
        t.players?.some((p) => p.userId === userId),
      );
      if (alreadyInSession) {
        throw new BadRequestException('Организатор уже участвует в этой сессии');
      }
    }

    // Ищем команду или создаем новую
    const requestedTeamName = joinSessionDto.teamName?.trim()
      ? joinSessionDto.teamName.trim()
      : undefined;
    let team = requestedTeamName ? session.teams.find((t) => t.name === requestedTeamName) : undefined;
    
    if (!team) {
      if (session.teams.length >= session.settings.maxTeams) {
        throw new BadRequestException('Достигнуто максимальное количество команд');
      }

      team = this.teamsRepository.create({
        // Если teamName не передан — создаем новую команду (Команда 1, 2, 3...).
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
    const session = await this.sessionsRepository.findOne({
      where: { id },
      relations: ['game', 'game.categories', 'game.categories.questions', 'teams', 'teams.players'],
    });

    if (!session) {
      throw new NotFoundException('Сессия не найдена');
    }

    return session;
  }

  async findByUser(userId: string): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: [
        { hostId: userId },
        { teams: { players: { userId } } },
      ],
      relations: ['game', 'teams'],
      order: { createdAt: 'DESC' },
    });
  }

  async start(id: string, userId: string): Promise<Session> {
    const session = await this.findOne(id);

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
    }

    return this.sessionsRepository.save(session);
  }

  async markCrocodileTerm(
    id: string,
    userId: string,
    result: CrocodileTermResult,
    termId?: string,
  ): Promise<Session> {
    const session = await this.findOne(id);
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

    return this.sessionsRepository.save(session);
  }

  async answerQuestion(
    id: string,
    userId: string,
    categoryId: string,
    questionId: string,
    submitDto?: SubmitAnswerDto,
  ): Promise<Session> {
    const session = await this.findOne(id);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    if (session.game?.type === 'quiz') {
      // В викторине пользователь отвечает отдельно на каждый вопрос.
      // Засчитываем ответ на уровне пользователя (а очки начисляются команде).
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

      // Проверяем, что ответ отправляют на текущий вопрос.
      const quizQuestions = session.game.categories.flatMap((c) =>
        c.questions.map((q) => ({
          categoryId: c.id,
          questionId: q.id,
        })),
      );
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

      return this.sessionsRepository.save(session);
    }

    // Для "своей игры" мы просто блокируем повторное открытие вопроса.
    const isAnswered = session.answeredQuestions.some(
      (aq) => aq.categoryId === categoryId && aq.questionId === questionId && !aq.userId,
    );

    if (isAnswered) {
      throw new BadRequestException('На этот вопрос уже отвечали');
    }

    session.answeredQuestions.push({ categoryId, questionId });

    return this.sessionsRepository.save(session);
  }

  async revealQuizQuestion(
    id: string,
    categoryId: string,
    questionId: string,
  ): Promise<Session> {
    const session = await this.findOne(id);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    if (session.game?.type !== 'quiz') {
      throw new BadRequestException('Режим викторины не активен');
    }

    // Проверяем, что сейчас раскрывают текущий вопрос.
    const quizQuestions = session.game.categories.flatMap((c) =>
      c.questions.map((q) => ({
        categoryId: c.id,
        questionId: q.id,
      })),
    );
    const currentIndex = session.currentQuestionIndex ?? 0;
    const current = quizQuestions[currentIndex];
    if (!current || current.categoryId !== categoryId || current.questionId !== questionId) {
      throw new BadRequestException('Можно раскрывать только текущий вопрос');
    }

    const question = session.game.categories
      .flatMap((c) => c.questions.map((q) => ({ categoryId: c.id, question: q })))
      .find((x) => x.categoryId === categoryId && x.question.id === questionId)?.question;

    if (!question) {
      throw new NotFoundException('Вопрос не найден');
    }

    // Начисляем очки тем пользователям, которые ответили правильно.
    // Очки выдаём команде: value начисляется за каждого корректно ответившего игрока.
    const toScore = session.answeredQuestions.filter(
      (aq) =>
        aq.categoryId === categoryId &&
        aq.questionId === questionId &&
        aq.userId &&
        aq.isCorrect &&
        !aq.scored,
    );

    const updatedAnswered = session.answeredQuestions.map((aq) => {
      const matches =
        aq.categoryId === categoryId &&
        aq.questionId === questionId &&
        aq.userId &&
        aq.isCorrect;

      if (!matches) return aq;
      if (aq.scored) return aq;

      return { ...aq, scored: true };
    });

    // Применяем очки на уровне teams (только для тех, кто ещё не получал очки).
    for (const sub of toScore) {
      const team = session.teams.find((t) => t.id === sub.teamId);
      if (!team) continue;
      team.score += question.value;
    }

    session.answeredQuestions = updatedAnswered as any;

    // Переходим к следующему вопросу / финишу.
    const total = quizQuestions.length;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= total) {
      session.status = 'finished';
      session.finishedAt = new Date();
    } else {
      session.currentQuestionIndex = nextIndex;
    }

    return this.sessionsRepository.save(session);
  }

  async updateScore(id: string, userId: string, updateScoreDto: UpdateScoreDto): Promise<Session> {
    const session = await this.findOne(id);

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
    const session = await this.findOne(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может завершить игру');
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

    // Увеличиваем счетчик игр
    await this.gamesService.incrementPlays(session.gameId);

    return this.sessionsRepository.save(session);
  }

  async addTeam(id: string, userId: string, dto: AddTeamDto): Promise<Session> {
    const session = await this.findOne(id);

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
    const session = await this.findOne(id);

    if (session.hostId !== userId) {
      throw new ForbiddenException('Только создатель может удалять сессии');
    }

    await this.sessionsRepository.remove(session);
  }
}