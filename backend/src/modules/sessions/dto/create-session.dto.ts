import { Type } from 'class-transformer';
import { IsUUID, IsOptional, IsNumber, Min, Max, IsBoolean, ValidateNested } from 'class-validator';

export class SessionSettingsDto {
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(8)
  maxTeams?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  maxPlayersPerTeam?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(120)
  timePerQuestion?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(120)
  timePerTerm?: number;

  @IsOptional()
  @IsBoolean()
  allowNegativeScores?: boolean;
}

export class CreateSessionDto {
  @IsUUID()
  gameId: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SessionSettingsDto)
  settings?: SessionSettingsDto;
}