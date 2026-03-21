import { IsString, IsOptional, MinLength, IsNotEmpty } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  @IsNotEmpty({ message: 'Код приглашения обязателен' })
  inviteCode: string;

  @IsString()
  @MinLength(1, { message: 'Имя игрока должно быть не менее 1 символа' })
  @IsNotEmpty({ message: 'Имя игрока обязательно' })
  playerName: string;

  @IsOptional()
  @IsString()
  teamName?: string;
}