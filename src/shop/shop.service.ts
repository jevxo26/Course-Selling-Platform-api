import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';
import * as bcrypt from 'bcryptjs';
import { MediaService } from '../media/media.service';
import * as express from 'express';

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Shop)
    private shopRepository: Repository<Shop>,
    private mediaService: MediaService,
  ) {}

  async create(createShopDto: CreateShopDto, file?: any, req?: express.Request) {
    const { password, ...rest } = createShopDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let logoUrl = createShopDto.logo;
    if (file && req) {
      logoUrl = this.mediaService.getUploadUrl(file.filename, req);
    }

    const shop = this.shopRepository.create({
      ...rest,
      password: hashedPassword,
      logo: logoUrl,
    });
    return this.shopRepository.save(shop);
  }

  async findAll(options: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const query = this.shopRepository.createQueryBuilder('shop')
      .select([
        'shop.id',
        'shop.name',
        'shop.gmail',
        'shop.logo',
        'shop.price',
        'shop.createdAt',
        'shop.updatedAt',
      ]);

    if (search) {
      query.where('shop.name ILIKE :search OR shop.gmail ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('shop.id', 'DESC')
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

  async findOne(id: number) {
    const shop = await this.shopRepository.findOne({ where: { id } });
    if (!shop) {
      throw new NotFoundException(`Shop with ID ${id} not found`);
    }
    return shop;
  }

  async update(id: number, updateShopDto: UpdateShopDto, file?: any, req?: express.Request) {
    const shop = await this.findOne(id);
    
    if (updateShopDto.password) {
      updateShopDto.password = await bcrypt.hash(updateShopDto.password, 10);
    }

    if (file && req) {
      updateShopDto.logo = this.mediaService.getUploadUrl(file.filename, req);
    }

    await this.shopRepository.update(id, updateShopDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const shop = await this.findOne(id);
    try {
      return await this.shopRepository.softDelete(id);
    } catch (error: any) {
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }
  }
}
