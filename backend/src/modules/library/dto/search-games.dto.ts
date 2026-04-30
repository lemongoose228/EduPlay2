import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchGamesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['own', 'quiz', 'crocodile', 'wheel', 'station'])
  type?: 'own' | 'quiz' | 'crocodile' | 'wheel' | 'station';

  @IsOptional()
  @IsEnum(['likes', 'newest'])
  sortBy?: 'likes' | 'newest';

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