import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopPurchase, ShopPurchaseStatus } from './entities/shop-purchase.entity';
import { Shop } from '../shop/entities/shop.entity';
import { User } from '../users/entities/user.entity';
import { CreateShopPurchaseDto } from './dto/create-shop-purchase.dto';
import { ManualShopPurchaseDto } from './dto/manual-shop-purchase.dto';
import { ZinipayService } from '../enrollment/zinipay.service';

@Injectable()
export class ShopPurchaseService {
  constructor(
    @InjectRepository(ShopPurchase)
    private readonly shopPurchaseRepository: Repository<ShopPurchase>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly zinipayService: ZinipayService,
  ) {}

  async initiateZinipayPayment(userId: number, createDto: CreateShopPurchaseDto) {
    const { shopId } = createDto;
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 1. Check if already purchased
    const existingCompleted = await this.shopPurchaseRepository.findOne({
      where: { 
        user: { id: userId }, 
        shop: { id: shopId }, 
        status: ShopPurchaseStatus.COMPLETED 
      },
    });

    if (existingCompleted) {
      throw new BadRequestException('You have already purchased this shop');
    }

    // 2. Reuse PENDING purchase if exists, otherwise create new
    let purchase = await this.shopPurchaseRepository.findOne({
      where: { 
        user: { id: userId }, 
        shop: { id: shopId }, 
        status: ShopPurchaseStatus.PENDING 
      },
    });

    if (!purchase) {
      purchase = this.shopPurchaseRepository.create({
        user,
        shop,
      });
    }

    purchase.amount = createDto.amount || shop.price;
    purchase.status = ShopPurchaseStatus.PENDING;
    purchase.paymentMethod = 'zinipay';
    purchase.transactionId = null;

    const savedPurchase = await this.shopPurchaseRepository.save(purchase);

    // Get ZiniPay payment URL
    const paymentResponse = await this.zinipayService.createPayment(
      purchase.amount, 
      savedPurchase.id, 
      `/shop-purchases/zinipay/callback?purchaseId=${savedPurchase.id}`
    );
    
    return {
      purchaseId: savedPurchase.id,
      paymentUrl: paymentResponse.zinipayURL,
    };
  }

  async handleZinipayCallback(paymentID: string, purchaseId: number) {
    const purchase = await this.shopPurchaseRepository.findOne({
      where: { id: purchaseId },
      relations: ['shop', 'user'],
    });

    if (!purchase) throw new NotFoundException('Purchase not found');

    const executionResponse = await this.zinipayService.verifyPayment(paymentID);

    if (executionResponse.status === 'COMPLETED' || executionResponse.status === 'success') {
      purchase.status = ShopPurchaseStatus.COMPLETED;
      purchase.transactionId = executionResponse.transaction_id || executionResponse.trxID || paymentID;
      purchase.purchasedAt = new Date();
      await this.shopPurchaseRepository.save(purchase);
      return { status: 'success', message: 'Purchase successful' };
    } else {
      purchase.status = ShopPurchaseStatus.FAILED;
      await this.shopPurchaseRepository.save(purchase);
      return { status: 'failed', message: 'Payment failed' };
    }
  }

  async submitManualPurchase(userId: number, manualDto: ManualShopPurchaseDto) {
    const { shopId, amount, paymentMethod, transactionId } = manualDto;

    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const existingCompleted = await this.shopPurchaseRepository.findOne({
      where: { user: { id: userId }, shop: { id: shopId }, status: ShopPurchaseStatus.COMPLETED },
    });

    if (existingCompleted) {
      throw new BadRequestException('You have already purchased this shop');
    }

    const purchase = this.shopPurchaseRepository.create({
      user,
      shop,
      amount: amount || shop.price,
      paymentMethod,
      transactionId: transactionId || null,
      status: ShopPurchaseStatus.PENDING,
      isManual: true,
    });

    return await this.shopPurchaseRepository.save(purchase);
  }

  async approveManualPurchase(id: number) {
    const purchase = await this.shopPurchaseRepository.findOne({ where: { id } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (!purchase.isManual) throw new BadRequestException('Only manual purchases can be approved this way');

    purchase.status = ShopPurchaseStatus.COMPLETED;
    purchase.purchasedAt = new Date();
    
    return await this.shopPurchaseRepository.save(purchase);
  }

  async rejectManualPurchase(id: number) {
    const purchase = await this.shopPurchaseRepository.findOne({ where: { id } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (!purchase.isManual) throw new BadRequestException('Only manual purchases can be rejected this way');

    purchase.status = ShopPurchaseStatus.REJECTED;
    
    return await this.shopPurchaseRepository.save(purchase);
  }

  async findAll() {
    return await this.shopPurchaseRepository.find({
      relations: ['user', 'shop'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMyPurchases(userId: number) {
    const purchases = await this.shopPurchaseRepository.createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.shop', 'shop')
      .addSelect('shop.password') // explicitly select password
      .where('purchase.userId = :userId', { userId })
      .orderBy('purchase.createdAt', 'DESC')
      .getMany();

    return purchases.map((p) => {
      const { password, ...shopDetails } = p.shop;
      return {
        ...shopDetails,
        // Only show password if the purchase is fully completed
        ...(p.status === ShopPurchaseStatus.COMPLETED ? { password } : {}),
        purchaseStatus: p.status,
        purchasedAt: p.purchasedAt,
      };
    });
  }

  async getLiveEarnings() {
    const purchases = await this.shopPurchaseRepository.find({
      where: { status: ShopPurchaseStatus.COMPLETED },
      relations: ['user', 'shop'],
      order: { purchasedAt: 'DESC' },
      take: 20,
    });

    return purchases.map(p => ({
      id: p.id,
      name: p.user?.name || 'Anonymous',
      course: p.shop?.name || 'Unknown Product',
      amount: `+$${p.amount || p.shop?.price || '0.00'}`,
      avatar: p.user?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || 'A')}`,
    }));
  }
}
