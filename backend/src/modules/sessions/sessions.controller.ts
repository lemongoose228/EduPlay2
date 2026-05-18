import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
import { AddTeamDto } from './dto/add-team.dto';
import { MarkCrocodileTermDto } from './dto/mark-crocodile-term.dto';
import { TicTacToeSetupDto } from './dto/tictactoe-setup.dto';
import { TicTacToeOpenCellDto } from './dto/tictactoe-open-cell.dto';
import { TicTacToeAnswerDto } from './dto/tictactoe-answer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SessionsTimerService } from './sessions-timer.service';
import { SessionsGateway } from './sessions.gateway';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionsTimerService: SessionsTimerService,
    private readonly sessionsGateway: SessionsGateway,
  ) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(user.id, createSessionDto);
  }

  @Post('join')
  join(@CurrentUser() user: User, @Body() joinSessionDto: JoinSessionDto) {
    return this.sessionsService.join(user.id, joinSessionDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.sessionsService.findByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Post(':id/start')
  async start(@Param('id') id: string, @CurrentUser() user: User) {
    const session = await this.sessionsService.start(id, user.id);
    if (session.game?.type === 'quiz' && session.status === 'active') {
      await this.sessionsTimerService.scheduleQuizQuestionTimer(
        session.id,
        session.currentQuestionIndex ?? 0,
        session.settings?.timePerQuestion ?? 30,
      );
    }
    this.sessionsGateway.emitSessionState(id, session);
    return session;
  }

  @Post(':id/answer/:categoryId/:questionId')
  
  answerQuestion(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: User,
    @Body() submitDto: SubmitAnswerDto,
  ) {
    return this.sessionsService.answerQuestion(id, user.id, categoryId, questionId, submitDto);
  }

  @Post(':id/quiz/reveal/:categoryId/:questionId')
  
  async revealQuizQuestion(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: User,
  ) {
    const reveal = await this.sessionsService.getQuizRevealInfoForCurrentQuestion(id);
    const session = await this.sessionsService.revealQuizQuestion(
      id,
      user.id,
      categoryId,
      questionId,
    );
    if (reveal) {
      await this.sessionsTimerService.clearQuizQuestionTimer(id, reveal.index);
    }
    if (session.game?.type === 'quiz' && session.status === 'active') {
      await this.sessionsTimerService.scheduleQuizQuestionTimer(
        session.id,
        session.currentQuestionIndex ?? 0,
        session.settings?.timePerQuestion ?? 30,
      );
    }
    if (reveal) {
      this.sessionsGateway.emitQuizRevealed(id, reveal, 'timer');
    }
    this.sessionsGateway.emitSessionState(id, session);
    return session;
  }

  @Post(':id/score')
  updateScore(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateScoreDto: UpdateScoreDto,
  ) {
    return this.sessionsService.updateScore(id, user.id, updateScoreDto);
  }

  @Post(':id/finish')
  async finish(@Param('id') id: string, @CurrentUser() user: User) {
    const before = await this.sessionsService.findOne(id);
    const session = await this.sessionsService.finish(id, user.id);
    if (before.game?.type === 'quiz') {
      await this.sessionsTimerService.clearQuizQuestionTimer(
        id,
        before.currentQuestionIndex ?? 0,
      );
    }
    this.sessionsGateway.emitSessionState(id, session);
    return session;
  }

  @Post(':id/crocodile/guess')
  markCrocodileGuessed(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: MarkCrocodileTermDto,
  ) {
    return this.sessionsService.markCrocodileTerm(id, user.id, 'guessed', dto.termId);
  }

  @Post(':id/crocodile/miss')
  markCrocodileMissed(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: MarkCrocodileTermDto,
  ) {
    return this.sessionsService.markCrocodileTerm(id, user.id, 'missed', dto.termId);
  }

  @Post(':id/tictactoe/setup')
  setupTicTacToe(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: TicTacToeSetupDto,
  ) {
    return this.sessionsService.setupTicTacToe(id, user.id, dto);
  }

  @Post(':id/tictactoe/open-cell')
  openTicTacToeCell(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: TicTacToeOpenCellDto,
  ) {
    return this.sessionsService.openTicTacToeCell(id, user.id, dto.cellIndex);
  }

  @Post(':id/tictactoe/answer')
  answerTicTacToe(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: TicTacToeAnswerDto,
  ) {
    return this.sessionsService.answerTicTacToe(id, user.id, dto.correct);
  }

  @Post(':id/teams')
  addTeam(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: AddTeamDto,
  ) {
    return this.sessionsService.addTeam(id, user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.remove(id, user.id);
  }
}