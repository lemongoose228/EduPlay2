import { IsOptional, IsString, IsEnum, IsNumber, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { GAME_AGE_PLUS_CODE, GAME_AGE_SCALE_MIN } from '../../games/game-age-query.util';

export class SearchGamesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['own', 'quiz', 'crocodile', 'wheel', 'station', 'tictactoe'])
  type?: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station' | 'tictactoe';

  @IsOptional()
  @IsEnum(['likes', 'newest'])
  sortBy?: 'likes' | 'newest';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(GAME_AGE_SCALE_MIN)
  @Max(GAME_AGE_PLUS_CODE)
  ageFrom?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(GAME_AGE_SCALE_MIN)
  @Max(GAME_AGE_PLUS_CODE)
  ageTo?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 12;
}