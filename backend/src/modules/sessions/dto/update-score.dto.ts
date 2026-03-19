import { IsUUID, IsNumber } from 'class-validator';

export class UpdateScoreDto {
  @IsUUID()
  teamId: string;

  @IsNumber()
  points: number;
}