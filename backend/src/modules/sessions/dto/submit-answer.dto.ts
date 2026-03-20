import { IsOptional, IsString } from 'class-validator';

export class SubmitAnswerDto {
  @IsOptional()
  @IsString()
  answer?: string;
}

