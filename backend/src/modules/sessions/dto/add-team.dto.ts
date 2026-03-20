import { IsOptional, IsString } from 'class-validator';

export class AddTeamDto {
  @IsOptional()
  @IsString()
  name?: string;
}

