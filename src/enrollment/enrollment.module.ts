import { Module } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './entities/enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { ZinipayService } from './zinipay.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enrollment, Course, User]),
    HttpModule,
    SettingsModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService, ZinipayService],
  exports: [EnrollmentService, ZinipayService],
})
export class EnrollmentModule {}
