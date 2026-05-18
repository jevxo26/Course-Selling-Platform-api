import { IsNumber, IsOptional } from 'class-validator';

export class CreateWithdrawDto {
  @IsOptional()
  @IsNumber()
  productId?: number;

  @IsOptional()
  @IsNumber()
  enrollmentId?: number;
}
