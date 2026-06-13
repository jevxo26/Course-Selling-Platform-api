import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopPurchaseService } from './shop-purchase.service';
import { ShopPurchaseController } from './shop-purchase.controller';
import { ShopPurchase } from './entities/shop-purchase.entity';
import { Shop } from '../shop/entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopPurchase, Shop, User]),
    EnrollmentModule, // Import EnrollmentModule to use ZinipayService
  ],
  controllers: [ShopPurchaseController],
  providers: [ShopPurchaseService],
})
export class ShopPurchaseModule {}
