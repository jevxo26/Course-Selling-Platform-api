import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WithdrawService } from './withdraw.service';
import { WithdrawController } from './withdraw.controller';
import { Withdraw } from './entities/withdraw.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { Percentage } from '../percentage/entities/percentage.entity';
import { Enrollment } from '../enrollment/entities/enrollment.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Withdraw, Product, User, Percentage, Enrollment]),
    WalletModule,
  ],
  controllers: [WithdrawController],
  providers: [WithdrawService],
})
export class WithdrawModule {}
