import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNumber,
  IsInt,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export const GAME_AGE_SCALE_MIN = 2;
/** 26 означает «25+» */
export const GAME_AGE_PLUS_CODE = 26;
export const GAME_AGE_SCALE_MAX = GAME_AGE_PLUS_CODE;

export enum GameType {
  Own = 'own',
  Quiz = 'quiz',
  Crocodile = 'crocodile',
  Wheel = 'wheel',
  Station = 'station',
  Tictactoe = 'tictactoe',
}

class QuestionDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  value!: number;
}

export class CategoryDto {
  @IsString()
  name!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions!: QuestionDto[];
}

export class CreateGameDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GameType)
  type!: GameType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CategoryDto)
  categories!: CategoryDto[];

  @IsOptional()
  settings?: {
    timePerQuestion?: number;
    timePerTerm?: number;
    allowNegativeScores?: boolean;
  };

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsInt()
  @Min(GAME_AGE_SCALE_MIN)
  @Max(GAME_AGE_SCALE_MAX)
  ageFrom?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsInt()
  @Min(GAME_AGE_SCALE_MIN)
  @Max(GAME_AGE_SCALE_MAX)
  ageTo?: number | null;
}