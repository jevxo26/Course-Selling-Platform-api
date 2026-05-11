import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateInstructorDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  experience?: string;

  @IsString()
  @IsOptional()
  designation?: string;

  @IsOptional()
  metadata?: any;
}
