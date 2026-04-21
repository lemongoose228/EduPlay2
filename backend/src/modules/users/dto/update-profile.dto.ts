import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  ValidateIf,
  Matches,
} from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Имя должно быть строкой' })
  @MinLength(2, { message: 'Имя должно содержать минимум 2 символа' })
  @MaxLength(100, { message: 'Имя не длиннее 100 символов' })
  name!: string;

  /** URL (http/https) пресета или путь к загруженному файлу `/uploads/avatars/...` */
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/.+|\/uploads\/avatars\/.+)$/, {
    message: 'Аватар: допустимы только URL (http/https) или загруженное изображение',
  })
  avatar?: string | null;
}
