import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getWallet(userId: number): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!wallet) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }
      wallet = this.walletRepository.create({ user, balance: 0 });
      wallet = await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  async addBalance(userId: number, amount: number): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    wallet.balance = Number(wallet.balance) + Number(amount);
    return await this.walletRepository.save(wallet);
  }

  async subtractBalance(userId: number, amount: number): Promise<Wallet> {
    const wallet = await this.getWallet(userId);
    if (Number(wallet.balance) < Number(amount)) {
      throw new Error('Insufficient balance');
    }
    wallet.balance = Number(wallet.balance) - Number(amount);
    return await this.walletRepository.save(wallet);
  }

  async findAll(options: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const query = this.walletRepository.createQueryBuilder('wallet')
      .leftJoinAndSelect('wallet.user', 'user');

    if (search) {
      query.where('user.name ILIKE :search OR user.email ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query
      .orderBy('wallet.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const wallet = await this.walletRepository.findOne({ where: { id }, relations: ['user'] });
    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${id} not found`);
    }
    return wallet;
  }

  async remove(id: number) {
    const wallet = await this.findOne(id);
    await this.walletRepository.softDelete(id);
    return wallet;
  }
}
