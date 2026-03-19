import { IsString, IsOptional, MinLength } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  inviteCode: string;

  @IsString()
  @MinLength(2)
  playerName: string;

  @IsOptional()
  @IsString()
  teamName?: string;
}