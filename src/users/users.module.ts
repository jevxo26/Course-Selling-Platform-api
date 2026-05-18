import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { MediaModule } from '../media/media.module';
import { Course } from '../course/entities/course.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { Percentage } from '../percentage/entities/percentage.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, Enrollment, Percentage]),
    MediaModule,
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
})
export class UsersModule {}
