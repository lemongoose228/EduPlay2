import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { StorageService } from '../../storage/storage.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from './entities/user-role.enum';

const AVATAR_SUBDIR = 'avatars';

@Injectable()
export class UsersService {
  constructor(
    private readonly storageService: StorageService,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  /** Принимает UUID или числовой publicId из UI. */
  async resolveIdToUuid(raw: string): Promise<string> {
    const t = raw.trim();
    if (!t) {
      throw new NotFoundException('Пользователь не найден');
    }
    if (/^\d+$/.test(t)) {
      const byPublic = await this.usersRepository.findOne({
        where: { publicId: t },
      });
      if (!byPublic) {
        throw new NotFoundException('Пользователь не найден');
      }
      return byPublic.id;
    }
    await this.findById(t);
    return t;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findSuperAdmin(): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { role: UserRole.SUPER_ADMIN },
    });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async setRole(userId: string, role: UserRole): Promise<Partial<User>> {
    const user = await this.findById(userId);
    user.role = role;
    await this.usersRepository.save(user);
    return this.getProfile(userId);
  }

  async setBlocked(
    userId: string,
    isBlocked: boolean,
    reason?: string | null,
  ): Promise<Partial<User>> {
    const user = await this.findById(userId);
    user.isBlocked = isBlocked;
    user.blockedAt = isBlocked ? new Date() : null;
    user.blockedReason = isBlocked ? reason?.trim() || null : null;
    await this.usersRepository.save(user);
    return this.getProfile(userId);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.findById(id);
    const previousAvatar = user.avatar;
    user.name = dto.name.trim();

    if (dto.avatar !== undefined) {
      const nextAvatar =
        dto.avatar === null || dto.avatar === '' ? null : dto.avatar.trim();

      if (previousAvatar !== nextAvatar) {
        await this.storageService.deleteByUrl(previousAvatar);
      }

      user.avatar = nextAvatar;
    }

    await this.usersRepository.save(user);
    return this.getProfile(id);
  }

  async getProfile(id: string): Promise<Partial<User>> {
    const user = await this.findById(id);
    const { password, ...result } = user;
    return result;
  }

  async getUserGames(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['games'],
      order: {
        games: {
          createdAt: 'DESC',
        },
      },
    });

    return user?.games || [];
  }

  async setAvatarFromUpload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<Partial<User>> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Пустой файл');
    }

    const user = await this.findById(userId);
    await this.storageService.deleteByUrl(user.avatar);

    const uploaded = await this.storageService.uploadFile(
      file,
      AVATAR_SUBDIR,
      `${userId}-${Date.now()}`,
    );

    user.avatar = uploaded.url;
    await this.usersRepository.save(user);

    return this.getProfile(userId);
  }
}
