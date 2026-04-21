"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fs_1 = require("fs");
const path_1 = require("path");
const user_entity_1 = require("./entities/user.entity");
const AVATAR_SUBDIR = 'avatars';
let UsersService = class UsersService {
    constructor(usersRepository) {
        this.usersRepository = usersRepository;
        this.uploadRoot = (0, path_1.join)(process.cwd(), 'uploads');
    }
    async ensureUploadDirs() {
        await fs_1.promises.mkdir((0, path_1.join)(this.uploadRoot, AVATAR_SUBDIR), { recursive: true });
    }
    async findById(id) {
        const user = await this.usersRepository.findOne({
            where: { id },
        });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        return user;
    }
    async findByEmail(email) {
        return this.usersRepository.findOne({ where: { email } });
    }
    async create(userData) {
        const user = this.usersRepository.create(userData);
        return this.usersRepository.save(user);
    }
    async updateProfile(id, dto) {
        const user = await this.findById(id);
        user.name = dto.name.trim();
        if (dto.avatar !== undefined) {
            user.avatar =
                dto.avatar === null || dto.avatar === '' ? null : dto.avatar.trim();
        }
        await this.usersRepository.save(user);
        return this.getProfile(id);
    }
    async getProfile(id) {
        const user = await this.findById(id);
        const { password, ...result } = user;
        return result;
    }
    async getUserGames(id) {
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
    async setAvatarFromUpload(userId, file) {
        if (!file?.buffer?.length) {
            throw new common_1.BadRequestException('Пустой файл');
        }
        await this.ensureUploadDirs();
        const user = await this.findById(userId);
        await this.removeStoredAvatarFile(user.avatar);
        const ext = this.extensionFromMimetype(file.mimetype);
        const filename = `${userId}-${Date.now()}${ext}`;
        const diskPath = (0, path_1.join)(this.uploadRoot, AVATAR_SUBDIR, filename);
        await fs_1.promises.writeFile(diskPath, file.buffer);
        user.avatar = `/uploads/${AVATAR_SUBDIR}/${filename}`;
        await this.usersRepository.save(user);
        return this.getProfile(userId);
    }
    extensionFromMimetype(mimetype) {
        const map = {
            'image/jpeg': '.jpg',
            'image/jpg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'image/gif': '.gif',
        };
        return map[mimetype] || '.bin';
    }
    async removeStoredAvatarFile(avatarUrl) {
        if (!avatarUrl || !avatarUrl.startsWith(`/uploads/${AVATAR_SUBDIR}/`)) {
            return;
        }
        const relative = avatarUrl.replace(/^\/uploads\//, '');
        const abs = (0, path_1.join)(this.uploadRoot, relative);
        try {
            await fs_1.promises.unlink(abs);
        }
        catch {
            // файл уже удалён или отсутствует
        }
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
