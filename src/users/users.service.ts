import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as express from 'express';
import { MediaService } from '../media/media.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mediaService: MediaService,
  ) {}

  // ===========================================================================
  // USER CREATION
  // ===========================================================================

  async create(createUserDto: CreateUserDto, file?: any, req?: express.Request): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let photoUrl = createUserDto.photo;
    if (file && req) {
      photoUrl = this.mediaService.getUploadUrl(file.filename, req);
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      photo: photoUrl,
    });
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: any, file?: any, req?: express.Request): Promise<User> {
    if (file && req) {
      updateUserDto.photo = this.mediaService.getUploadUrl(file.filename, req);
    }
    
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id) as Promise<User>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { email },
      select: ['id', 'email', 'password', 'role', 'name', 'photo', 'refreshToken', 'isBanned']
    });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findAll(options: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const query = this.usersRepository.createQueryBuilder('user');

    if (search) {
      query.where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('user.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================================================================
  // AUTH HELPERS
  // ===========================================================================

  async updateRefreshToken(userId: number, refreshToken: string | null): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken });
  }

  async updatePassword(userId: number, hashedPass: string): Promise<void> {
    await this.usersRepository.update(userId, { password: hashedPass });
  }

  async updateResetToken(userId: number, token: string | null, expires: Date | null): Promise<void> {
    await this.usersRepository.update(userId, { 
      resetPasswordToken: token,
      resetPasswordExpires: expires 
    });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findOne({ 
      where: { resetPasswordToken: token },
      select: ['id', 'email', 'resetPasswordExpires']
    });
  }

  // ===========================================================================
  // ADMIN ACTIONS
  // ===========================================================================

  async ban(id: number, reason: string): Promise<User> {
    await this.usersRepository.update(id, { 
      isBanned: true,
      banReason: reason,
    });
    return this.findOne(id) as Promise<User>;
  }

  async unban(id: number): Promise<User> {
    await this.usersRepository.update(id, { 
      isBanned: false,
      banReason: null,
    });
    return this.findOne(id) as Promise<User>;
  }

  async remove(id: number): Promise<void> {
    await this.usersRepository.softDelete(id);
  }

  async restore(id: number): Promise<User> {
    await this.usersRepository.restore(id);
    return this.findOne(id) as Promise<User>;
  }
}
