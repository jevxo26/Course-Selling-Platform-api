import { IsNumber, IsOptional } from 'class-validator';

export class DirectWithdrawDto {
  @IsNumber()
  studentId: number;

  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  enrollmentId?: number;

  @IsNumber()
  @IsOptional()
  percentageId?: number;
}
