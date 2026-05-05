import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { PublishGameDto } from './dto/publish-game.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { GamesService } from './games.service';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('question-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
        if (!ok) {
          return cb(
            new BadRequestException('Допустимы только изображения JPEG, PNG, GIF или WebP') as Error,
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadQuestionImage(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }
    return this.gamesService.storeQuestionImageUpload(file);
  }

  @Post()
  create(@CurrentUser() user: User, @Body() createGameDto: CreateGameDto) {
    return this.gamesService.create(user.id, createGameDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.gamesService.findAll(user.id);
  }

  @Get('liked/ids')
  getLikedIds(@CurrentUser() user: User) {
    return this.gamesService.getLikedGameIds(user.id);
  }

  @Post(':id/like')
  like(@Param('id') id: string, @CurrentUser() user: User) {
    return this.gamesService.like(user.id, id);
  }

  @Delete(':id/like')
  unlike(@Param('id') id: string, @CurrentUser() user: User) {
    return this.gamesService.unlike(user.id, id);
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
    try {
      return this.gamesService.update(id, user.id, updateGameDto);
    } catch (exception: any) {
      
    }
    
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