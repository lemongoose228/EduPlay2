import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchGamesDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['own', 'quiz', 'crocodile'])
  type?: 'own' | 'quiz' | 'crocodile';

  @IsOptional()
  @IsEnum(['popular', 'likes', 'newest'])
  sortBy?: 'popular' | 'likes' | 'newest';

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