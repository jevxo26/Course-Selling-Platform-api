import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as express from 'express';
import { MediaService } from '../media/media.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private mediaService: MediaService,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, file?: any, req?: express.Request): Promise<Category> {
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });
    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    let photoUrl = createCategoryDto.photo;
    if (file && req) {
      photoUrl = this.mediaService.getUploadUrl(file.filename, req);
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      photo: photoUrl,
    });
    return this.categoryRepository.save(category);
  }

  async findAll(options: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const query = this.categoryRepository.createQueryBuilder('category');

    if (search) {
      query.where('category.name ILIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await query
      .orderBy('category.id', 'DESC')
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

  async findOne(id: number): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    file?: any,
    req?: express.Request,
  ): Promise<Category> {
    const category = await this.findOne(id);

    if (file && req) {
      updateCategoryDto.photo = this.mediaService.getUploadUrl(file.filename, req);
    }

    Object.assign(category, updateCategoryDto);
    return this.categoryRepository.save(category);
  }

  async remove(id: number): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.softRemove(category);
  }
}
