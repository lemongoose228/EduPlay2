import { IsBoolean, IsString } from 'class-validator';

export class SetAdminRoleDto {
  @IsString()
  userId: string;

  @IsBoolean()
  isAdmin: boolean;
}
