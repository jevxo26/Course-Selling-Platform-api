import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { AuthModule } from './auth/auth.module';
import { CourseModule } from './course/course.module';
import { CategoryModule } from './category/category.module';
import { InstructorModule } from './instructor/instructor.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { PaymentmethodModule } from './paymentmethod/paymentmethod.module';
import { ProductsModule } from './products/products.module';
import { PercentageModule } from './percentage/percentage.module';
import { WithdrawModule } from './withdraw/withdraw.module';
import { WalletModule } from './wallet/wallet.module';
import { ShopModule } from './shop/shop.module';
import { ShopPurchaseModule } from './shop-purchase/shop-purchase.module';
import { StatsModule } from './stats/stats.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE'),
        ssl: {
          rejectUnauthorized: false,
        },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    HealthModule,
    MediaModule,
    AuthModule,
    CourseModule,
    CategoryModule,
    InstructorModule,
    EnrollmentModule,
    PaymentmethodModule,
    ProductsModule,
    PercentageModule,
    WithdrawModule,
    WalletModule,
    ShopModule,
    ShopPurchaseModule,
    StatsModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
