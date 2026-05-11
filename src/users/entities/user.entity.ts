import { Entity, PrimaryGeneratedColumn, Column, DeleteDateColumn } from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  AFFILIATE = 'affiliate',
  ADMIN = 'admin',
  BUYER = 'buyer',
  INSTRUCTOR = 'instructor',
}

@Entity('user_list')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false }) // Hide password by default
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', nullable: true })
  country: string | null;

  @Column({ type: 'text', nullable: true, select: false }) // Hide refresh token by default
  refreshToken: string | null;

  @Column({ type: 'text', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetPasswordExpires: Date | null;

  @Column({ type: 'varchar', nullable: true })
  referCode: string | null;

  @Column({ type: 'text', nullable: true })
  photo: string | null;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'text', nullable: true })
  banReason: string | null;

  @DeleteDateColumn()
  deletedAt: Date;

  @Column({ default: true })
  isActive: boolean;
}
