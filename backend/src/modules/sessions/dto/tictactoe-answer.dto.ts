import { IsBoolean } from 'class-validator';

export class TicTacToeAnswerDto {
  @IsBoolean()
  correct!: boolean;
}
