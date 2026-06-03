import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { ShopPurchase } from '../shop-purchase/entities/shop-purchase.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Course, User, ShopPurchase])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
