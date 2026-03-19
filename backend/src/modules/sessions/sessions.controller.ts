import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JoinSessionDto } from './dto/join-session.dto';
import { UpdateScoreDto } from './dto/update-score.dto';
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
  join(@Body() joinSessionDto: JoinSessionDto) {
    return this.sessionsService.join(joinSessionDto);
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
  ) {
    return this.sessionsService.answerQuestion(id, categoryId, questionId);
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
}