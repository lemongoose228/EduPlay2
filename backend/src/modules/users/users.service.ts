import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join } from 'path';
import { User } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

const AVATAR_SUBDIR = 'avatars';

@Injectable()
export class UsersService {
  private readonly uploadRoot = join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  private async ensureUploadDirs() {
    await fs.mkdir(join(this.uploadRoot, AVATAR_SUBDIR), { recursive: true });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<Partial<User>> {
    const user = await this.findById(id);
    const previousAvatar = user.avatar;
    user.name = dto.name.trim();

    if (dto.avatar !== undefined) {
      const nextAvatar =
        dto.avatar === null || dto.avatar === '' ? null : dto.avatar.trim();

      if (previousAvatar !== nextAvatar) {
        await this.removeStoredAvatarFile(previousAvatar);
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

    await this.ensureUploadDirs();

    const user = await this.findById(userId);
    await this.removeStoredAvatarFile(user.avatar);

    const ext = this.extensionFromMimetype(file.mimetype);
    const filename = `${userId}-${Date.now()}${ext}`;
    const diskPath = join(this.uploadRoot, AVATAR_SUBDIR, filename);

    await fs.writeFile(diskPath, file.buffer);

    user.avatar = `/uploads/${AVATAR_SUBDIR}/${filename}`;
    await this.usersRepository.save(user);

    return this.getProfile(userId);
  }

  private extensionFromMimetype(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return map[mimetype] || '.bin';
  }

  private async removeStoredAvatarFile(avatarUrl: string | null) {
    if (!avatarUrl || !avatarUrl.startsWith(`/uploads/${AVATAR_SUBDIR}/`)) {
      return;
    }
    const relative = avatarUrl.replace(/^\/uploads\//, '');
    const abs = join(this.uploadRoot, relative);
    try {
      await fs.unlink(abs);
    } catch {
    }
  }
}
