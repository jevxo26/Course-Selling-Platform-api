import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { EnrollmentStatus } from '../enrollment/entities/enrollment.entity';
import * as express from 'express';
import { MediaService } from '../media/media.service';

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    
    private mediaService: MediaService,
  ) {}

  async create(createCourseDto: CreateCourseDto, file?: any, req?: express.Request): Promise<Course> {
    let thumbnailUrl = createCourseDto.thumbnail;
    if (file && req) {
      thumbnailUrl = this.mediaService.getUploadUrl(file.filename, req);
    }

    const { categoryId, instructorId, ...rest } = createCourseDto;

    const course = this.courseRepository.create({
      ...rest,
      category: categoryId ? { id: categoryId } as any : undefined,
      instructor: instructorId ? { id: instructorId } as any : undefined,
      thumbnail: thumbnailUrl,
    });
    return this.courseRepository.save(course);
  }

  async findAll(options: {
    search?: string;
    categoryId?: string;
    instructorId?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, categoryId, instructorId, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const query = this.courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .loadRelationCountAndMap(
        'course.enrollmentCount',
        'course.enrollments',
        'enrollment',
        (qb) => qb.where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      );

    if (search) {
      query.where('course.title ILIKE :search OR course.description ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (categoryId) {
      query.andWhere('course.categoryId = :categoryId', { categoryId });
    }

    if (instructorId) {
      query.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    const [items, total] = await query
      .orderBy('course.id', 'DESC')
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

  async findAllPublic(options: {
    search?: string;
    categoryId?: string;
    instructorId?: string;
    page?: number;
    limit?: number;
  }) {
    const result = await this.findAll(options);
    
    // Omit courseUrl from public response
    result.items = result.items.map(item => {
      const { courseUrl, ...rest } = item;
      return rest as any;
    });

    return result;
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.createQueryBuilder('course')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .loadRelationCountAndMap(
        'course.enrollmentCount',
        'course.enrollments',
        'enrollment',
        (qb) => qb.where('enrollment.status = :status', { status: EnrollmentStatus.COMPLETED })
      )
      .where('course.id = :id', { id })
      .getOne();
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }

  async update(
    id: number,
    updateCourseDto: UpdateCourseDto,
    file?: any,
    req?: express.Request,
  ): Promise<Course> {
    const course = await this.findOne(id);

    if (file && req) {
      updateCourseDto.thumbnail = this.mediaService.getUploadUrl(file.filename, req);
    }

    const { categoryId, instructorId, ...rest } = updateCourseDto;

    Object.assign(course, rest);
    
    if (categoryId !== undefined) {
      course.category = categoryId ? { id: categoryId } as any : null;
    }
    
    if (instructorId !== undefined) {
      course.instructor = instructorId ? { id: instructorId } as any : null;
    }

    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    try {
      await this.courseRepository.softDelete(id);
    } catch (error: any) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }
}
