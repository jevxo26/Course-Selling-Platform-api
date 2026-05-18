import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as express from 'express';
import { MediaService } from '../media/media.service';
import { Course } from '../course/entities/course.entity';
import { Enrollment, EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import { Percentage, PercentageType } from '../percentage/entities/percentage.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollmentRepository: Repository<Enrollment>,
    @InjectRepository(Percentage)
    private percentageRepository: Repository<Percentage>,
    private mediaService: MediaService,
  ) {}

  // ===========================================================================
  // USER CREATION
  // ===========================================================================

  async create(createUserDto: CreateUserDto, files?: any, req?: express.Request): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let photoUrl = createUserDto.photo;
    let nidFrontUrl = createUserDto.nidFrontSide;
    let nidBackUrl = createUserDto.nidBackSide;

    if (files && req) {
      if (files.image && files.image[0]) {
        photoUrl = this.mediaService.getUploadUrl(files.image[0].filename, req);
      }
      if (files.nidFrontSide && files.nidFrontSide[0]) {
        nidFrontUrl = this.mediaService.getUploadUrl(files.nidFrontSide[0].filename, req);
      }
      if (files.nidBackSide && files.nidBackSide[0]) {
        nidBackUrl = this.mediaService.getUploadUrl(files.nidBackSide[0].filename, req);
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    let referCode = createUserDto.referCode;
    if (!referCode && createUserDto.role === 'affiliate') {
      const namePart = createUserDto.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      referCode = `${namePart}${randomPart}`;
    }

    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      photo: photoUrl,
      nidFrontSide: nidFrontUrl,
      nidBackSide: nidBackUrl,
      referCode: referCode,
    });
    return this.usersRepository.save(user);
  }

  async update(id: number, updateUserDto: any, files?: any, req?: express.Request): Promise<User> {
    if (files && req) {
      if (files.image && files.image[0]) {
        updateUserDto.photo = this.mediaService.getUploadUrl(files.image[0].filename, req);
      }
      if (files.nidFrontSide && files.nidFrontSide[0]) {
        updateUserDto.nidFrontSide = this.mediaService.getUploadUrl(files.nidFrontSide[0].filename, req);
      }
      if (files.nidBackSide && files.nidBackSide[0]) {
        updateUserDto.nidBackSide = this.mediaService.getUploadUrl(files.nidBackSide[0].filename, req);
      }
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
  // AFFILIATE DASHBOARD
  // ===========================================================================

  async getAffiliateDashboard(userId: number, frontendUrl: string = 'http://localhost:3000') {
    const user = await this.findOne(userId);
    if (!user) {
      throw new ConflictException('User not found');
    }
    
    // Fallback if affiliate percentage not set
    let affiliatePercentage = 0;
    const percentageConfig = await this.percentageRepository.findOne({ where: { type: PercentageType.AFFILIATE } });
    if (percentageConfig) {
      affiliatePercentage = Number(percentageConfig.percentage);
    }

    const courses = await this.courseRepository.find({ where: { isPublished: true } });
    const dashboardStats = [];

    for (const course of courses) {
      const enrollments = await this.enrollmentRepository.find({
        where: {
          course: { id: course.id },
          affiliate: { id: user.id },
          status: EnrollmentStatus.COMPLETED
        }
      });

      const totalEnrollments = enrollments.length;
      let totalIncome = 0;
      
      for (const enrollment of enrollments) {
        totalIncome += (Number(enrollment.amount) * affiliatePercentage) / 100;
      }

      dashboardStats.push({
        courseId: course.id,
        courseTitle: course.title,
        courseThumbnail: course.thumbnail,
        price: course.price,
        affiliateLink: `${frontendUrl}/course/${course.id}?ref=${user.referCode}`,
        totalEnrollments,
        totalIncome
      });
    }

    return dashboardStats;
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
