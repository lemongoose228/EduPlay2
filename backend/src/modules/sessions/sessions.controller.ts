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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

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
  start(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.start(id, user.id);
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
  revealQuizQuestion(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() _user: User,
  ) {
    return this.sessionsService.revealQuizQuestion(id, categoryId, questionId);
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
  finish(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sessionsService.finish(id, user.id);
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