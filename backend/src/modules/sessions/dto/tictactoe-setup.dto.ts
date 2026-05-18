import { IsEnum, IsString, MinLength } from 'class-validator';
import type { TicTacToeSymbol } from '../entities/session.entity';

const TICTACTOE_SYMBOLS = ['cross', 'circle', 'heart', 'star'] as const;

export class TicTacToeSetupDto {
  @IsString()
  @MinLength(1)
  team1Name!: string;

  @IsString()
  @MinLength(1)
  team2Name!: string;

  @IsEnum(TICTACTOE_SYMBOLS)
  team1Symbol!: TicTacToeSymbol;

  @IsEnum(TICTACTOE_SYMBOLS)
  team2Symbol!: TicTacToeSymbol;
}
