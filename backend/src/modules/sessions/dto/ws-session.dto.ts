import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class WsSessionJoinDto {
  @IsUUID()
  sessionId: string;
}

export class WsQuizAnswerDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  questionId: string;

  @IsOptional()
  @IsString()
  answer?: string;
}

export class WsQuizRevealDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  questionId: string;
}

export class WsSessionScoreDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  teamId: string;

  @IsNumber()
  points: number;
}
