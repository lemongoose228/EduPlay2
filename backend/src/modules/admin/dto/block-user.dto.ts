import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class BlockUserDto {
  @IsString()
  userId: string;

  @IsBoolean()
  isBlocked: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
