import { IsOptional, IsUUID } from 'class-validator';

export class MarkCrocodileTermDto {
  @IsOptional()
  @IsUUID()
  termId?: string;
}
