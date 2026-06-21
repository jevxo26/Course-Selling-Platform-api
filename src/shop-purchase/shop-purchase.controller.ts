import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import type { Response } from 'express';
import { ShopPurchaseService } from './shop-purchase.service';
import { CreateShopPurchaseDto } from './dto/create-shop-purchase.dto';
import { ManualShopPurchaseDto } from './dto/manual-shop-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Controller('shop-purchases')
export class ShopPurchaseController {
  constructor(
    private readonly shopPurchaseService: ShopPurchaseService,
    private readonly configService: ConfigService,
  ) {}

  @Post('buy/zinipay')
  @UseGuards(JwtAuthGuard)
  async initiatePayment(@Body() createDto: CreateShopPurchaseDto) {
    return await this.shopPurchaseService.initiateZinipayPayment(createDto.userId, createDto);
  }

  @Get('zinipay/callback')
  async paymentCallback(
    @Query('paymentID') paymentID: string,
    @Query('purchaseId') purchaseId: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (status === 'cancel' || status === 'failure') {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }

    // Pass the purchaseId to the service (it acts as the referenceId)
    const result = await this.shopPurchaseService.handleZinipayCallback(paymentID, parseInt(purchaseId));

    if (result.status === 'success') {
      return res.redirect(`${frontendUrl}/payment/success?type=shop&purchaseId=${purchaseId}`);
    } else {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }
  }

  @Post('buy/manual')
  @UseGuards(JwtAuthGuard)
  async submitManualPurchase(@Body() manualDto: ManualShopPurchaseDto) {
    return await this.shopPurchaseService.submitManualPurchase(manualDto.userId, manualDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return await this.shopPurchaseService.findAll();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async findMyPurchases(@Req() req: any) {
    return await this.shopPurchaseService.findMyPurchases(req.user.id);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard)
  async findOneMyPurchase(@Param('id') id: string, @Req() req: any) {
    return await this.shopPurchaseService.findOneMyPurchase(+id, req.user.id);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveManualPurchase(@Param('id') id: string) {
    return await this.shopPurchaseService.approveManualPurchase(+id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectManualPurchase(@Param('id') id: string) {
    return await this.shopPurchaseService.rejectManualPurchase(+id);
  }
}
