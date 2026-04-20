import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum GameType {
  Own = 'own',
  Quiz = 'quiz',
  Crocodile = 'crocodile',
}

class QuestionDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  value!: number;
}

class CategoryDto {
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
}