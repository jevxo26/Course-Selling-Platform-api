import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
import { Percentage } from '../../percentage/entities/percentage.entity';
import { Enrollment } from '../../enrollment/entities/enrollment.entity';

export enum WithdrawStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('withdraws')
export class Withdraw {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Product, { nullable: true })
  product?: Product;


  @ManyToOne(() => Enrollment, { nullable: true })
  enrollment?: Enrollment;


  @ManyToOne(() => Percentage, { nullable: true })
  percentage?: Percentage;


  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  adminAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  studentAmount: number;

  @Column({
    type: 'enum',
    enum: WithdrawStatus,
    default: WithdrawStatus.PENDING,
  })
  status: WithdrawStatus;

  @Column({ type: 'text', nullable: true })
  rejectReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
