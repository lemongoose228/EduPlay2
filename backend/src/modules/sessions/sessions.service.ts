import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { Team } from './entities/team.entity';
import { Player } from './entities/player.entity';
import { GamesService } from '../games/games.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { UpdateScoreDto } from './dto/update-score.dto';

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

  async create(userId: string, createSessionDto: CreateSessionDto): Promise<Session> {
    const game = await this.gamesService.findOne(createSessionDto.gameId, userId);

    if (game.status !== 'published') {
      throw new BadRequestException('Нельзя создать сессию для неопубликованной игры');
    }

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
        timePerQuestion: createSessionDto.settings?.timePerQuestion || 30,
        allowNegativeScores: createSessionDto.settings?.allowNegativeScores || false,
      },
      teams: [],
      answeredQuestions: [],
    });

    return this.sessionsRepository.save(session);
  }

  async join(joinSessionDto: JoinSessionDto): Promise<Session> {
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

    // Ищем команду или создаем новую
    let team = session.teams.find(t => t.name === (joinSessionDto.teamName || 'Команда 1'));
    
    if (!team) {
      if (session.teams.length >= session.settings.maxTeams) {
        throw new BadRequestException('Достигнуто максимальное количество команд');
      }

      team = this.teamsRepository.create({
        name: joinSessionDto.teamName || `Команда ${session.teams.length + 1}`,
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

    if (session.teams.length < 2) {
      throw new BadRequestException('Для начала игры нужно минимум 2 команды');
    }

    session.status = 'active';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;

    return this.sessionsRepository.save(session);
  }

  async answerQuestion(
    id: string,
    categoryId: string,
    questionId: string,
  ): Promise<Session> {
    const session = await this.findOne(id);

    if (session.status !== 'active') {
      throw new BadRequestException('Игра не активна');
    }

    // Проверяем, не отвечали ли уже на этот вопрос
    const isAnswered = session.answeredQuestions.some(
      aq => aq.categoryId === categoryId && aq.questionId === questionId,
    );

    if (isAnswered) {
      throw new BadRequestException('На этот вопрос уже отвечали');
    }

    session.answeredQuestions.push({ categoryId, questionId });

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

    session.status = 'finished';
    session.finishedAt = new Date();

    // Увеличиваем счетчик игр
    await this.gamesService.incrementPlays(session.gameId);

    return this.sessionsRepository.save(session);
  }
}