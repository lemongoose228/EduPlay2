import { IsString, MinLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  gameId: string;

  @IsString()
  @MinLength(5, { message: 'Опишите причину жалобы (минимум 5 символов)' })
  reason: string;
}
