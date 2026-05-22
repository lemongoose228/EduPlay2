import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateTeamDto {
  @IsString()
  @IsNotEmpty({ message: 'Название команды обязательно' })
  @MinLength(1, { message: 'Название команды должно быть не менее 1 символа' })
  name!: string;
}
