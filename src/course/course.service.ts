import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
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

    const course = this.courseRepository.create({
      ...createCourseDto,
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
      .leftJoinAndSelect('course.instructor', 'instructor');

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

  async findOne(id: number): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['category', 'instructor'],
    });
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

    Object.assign(course, updateCourseDto);
    return this.courseRepository.save(course);
  }

  async remove(id: number): Promise<void> {
    const course = await this.findOne(id);
    await this.courseRepository.remove(course);
  }
}
