import { IsInt, Max, Min } from 'class-validator';

export class TicTacToeOpenCellDto {
  @IsInt()
  @Min(0)
  @Max(8)
  cellIndex!: number;
}
