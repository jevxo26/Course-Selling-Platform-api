import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePercentageDto } from './dto/create-percentage.dto';
import { UpdatePercentageDto } from './dto/update-percentage.dto';
import { Percentage } from './entities/percentage.entity';

@Injectable()
export class PercentageService {
  constructor(
    @InjectRepository(Percentage)
    private percentageRepository: Repository<Percentage>,
  ) {}

  async create(createPercentageDto: CreatePercentageDto) {
    try {
      const percentage = this.percentageRepository.create(createPercentageDto);
      return await this.percentageRepository.save(percentage);
    } catch (error) {
      if (error.code === '23505') { // Postgres unique constraint error
        throw new ConflictException(`Percentage for type ${createPercentageDto.type} already exists`);
      }
      throw error;
    }
  }

  async findAll() {
    return await this.percentageRepository.find();
  }

  async findOne(id: number) {
    const percentage = await this.percentageRepository.findOne({ where: { id } });
    if (!percentage) {
      throw new NotFoundException(`Percentage with ID ${id} not found`);
    }
    return percentage;
  }

  async update(id: number, updatePercentageDto: UpdatePercentageDto) {
    const percentage = await this.findOne(id);
    Object.assign(percentage, updatePercentageDto);
    return await this.percentageRepository.save(percentage);
  }

  async remove(id: number) {
    const percentage = await this.findOne(id);
    return await this.percentageRepository.softRemove(percentage);
  }
}

