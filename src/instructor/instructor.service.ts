import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Instructor } from './entities/instructor.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { UpdateInstructorDto } from './dto/update-instructor.dto';

@Injectable()
export class InstructorService {
  constructor(
    @InjectRepository(Instructor)
    private readonly instructorRepository: Repository<Instructor>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createInstructorDto: CreateInstructorDto): Promise<Instructor> {
    const { userId, ...profileData } = createInstructorDto;

    // Check if user exists
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if instructor profile already exists
    const existingInstructor = await this.instructorRepository.findOneBy({ user: { id: userId } });
    if (existingInstructor) {
      throw new ConflictException(`Instructor profile already exists for user ID ${userId}`);
    }

    // Update user role to INSTRUCTOR
    await this.usersRepository.update(userId, { role: UserRole.INSTRUCTOR });

    const instructor = this.instructorRepository.create({
      ...profileData,
      user,
    });

    return await this.instructorRepository.save(instructor);
  }

  async findAll(query: { search?: string; page?: number; limit?: number } = {}): Promise<{ data: Instructor[]; total: number }> {
    const { search, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.instructorRepository
      .createQueryBuilder('instructor')
      .leftJoinAndSelect('instructor.user', 'user')
      .skip(skip)
      .take(limit)
      .orderBy('instructor.id', 'DESC');

    if (search) {
      queryBuilder.where('user.name ILike :search OR instructor.designation ILike :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<Instructor> {
    const instructor = await this.instructorRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!instructor) {
      throw new NotFoundException(`Instructor with ID ${id} not found`);
    }
    return instructor;
  }

  async update(id: number, updateInstructorDto: UpdateInstructorDto): Promise<Instructor> {
    const instructor = await this.findOne(id);
    Object.assign(instructor, updateInstructorDto);
    return await this.instructorRepository.save(instructor);
  }

  async remove(id: number): Promise<{ message: string }> {
    const instructor = await this.findOne(id);
    await this.instructorRepository.softDelete(instructor.id);
    return { message: 'Instructor profile has been soft-deleted successfully' };
  }

  async restore(id: number): Promise<{ message: string }> {
    await this.instructorRepository.restore(id);
    return { message: 'Instructor profile has been restored successfully' };
  }
}
