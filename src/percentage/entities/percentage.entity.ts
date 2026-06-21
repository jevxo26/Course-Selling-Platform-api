import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export enum PercentageType {
  STUDENT = 'student',
  AFFILIATE = 'affiliate',
  PERCENTAGE = 'percentage',
}

@Entity('percentages')
export class Percentage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: PercentageType,
    unique: true, // Assuming one entry per type
  })
  type: PercentageType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  percentage: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

