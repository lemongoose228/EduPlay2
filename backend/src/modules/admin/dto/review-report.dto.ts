import { IsOptional, IsString } from 'class-validator';

export class ReviewReportDto {
  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  gameBlockReason?: string;
}
