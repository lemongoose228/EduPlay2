import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BlockGameDto {
  @IsString()
  gameId: string;

  @IsBoolean()
  isBlocked: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
