import { IsString, IsOptional } from 'class-validator';

export class PublishGameDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}