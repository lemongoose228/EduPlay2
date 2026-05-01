import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../users/entities/user-role.enum';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const token = this.generateToken(user);
    
    const { password, ...result } = user;
    
    return {
      user: result,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const loginValue = loginDto.email.trim();
    let user =
      loginValue.toLowerCase() === 'admin'
        ? await this.usersService.findSuperAdmin()
        : await this.usersService.findByEmail(loginValue);

    if (user && loginValue.toLowerCase() === 'admin' && user.role !== UserRole.SUPER_ADMIN) {
      user = null;
    }

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('Ваш аккаунт заблокирован');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const token = this.generateToken(user);
    
    const { password, ...result } = user;
    
    return {
      user: result,
      token,
    };
  }

  private generateToken(user: any) {
    const payload = { 
      sub: user.id, 
      email: user.email,
      name: user.name,
      role: user.role,
    };
    
    return this.jwtService.sign(payload);
  }
}