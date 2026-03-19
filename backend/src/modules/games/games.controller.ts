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
import { GamesService } from './games.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PublishGameDto } from './dto/publish-game.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createGameDto: CreateGameDto) {
    return this.gamesService.create(user.id, createGameDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.gamesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.gamesService.findOne(id, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateGameDto: UpdateGameDto,
  ) {
    return this.gamesService.update(id, user.id, updateGameDto);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() publishGameDto: PublishGameDto,
  ) {
    return this.gamesService.publish(id, user.id, publishGameDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.gamesService.remove(id, user.id);
  }
}