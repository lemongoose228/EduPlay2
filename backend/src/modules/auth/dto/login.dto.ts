import { IsString, MinLength, Validate } from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEmailOrAdminLogin', async: false })
class IsEmailOrAdminLoginConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.toLowerCase() === 'admin') return true;
    return /^\S+@\S+\.\S+$/.test(trimmed);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Введите корректный email или логин admin';
  }
}

export class LoginDto {
  @Validate(IsEmailOrAdminLoginConstraint)
  email: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
  password: string;
}