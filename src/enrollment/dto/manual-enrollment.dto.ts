import { IsNumber, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ManualEnrollmentDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsNumber()
  @IsNotEmpty()
  studentId: number;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  referCode?: string;
}
