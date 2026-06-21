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
  Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { EnrollmentService } from './enrollment.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ManualEnrollmentDto } from './dto/manual-enrollment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

import { ConfigService } from '@nestjs/config';

@Controller('enrollments')
export class EnrollmentController {
  constructor(
    private readonly enrollmentService: EnrollmentService,
    private readonly configService: ConfigService,
  ) { }

  @Post('pay')
  async initiatePayment(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return await this.enrollmentService.initiateEnrollment(createEnrollmentDto.studentId, createEnrollmentDto);
  }

  @Get('zinipay/callback')
  async paymentCallback(
    @Query('paymentID') paymentID: string,
    @Query('enrollmentId') enrollmentId: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (status === 'cancel' || status === 'failure') {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }

    const result = await this.enrollmentService.handlePaymentCallback(paymentID, parseInt(enrollmentId));

    if (result.status === 'success') {
      return res.redirect(`${frontendUrl}/payment/success`);
    } else {
      return res.redirect(`${frontendUrl}/payment/cancel`);
    }
  }

  @Post('manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async manualEnroll(@Body() manualEnrollmentDto: ManualEnrollmentDto) {
    return await this.enrollmentService.manualEnrollment(manualEnrollmentDto);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard)
  async getMyCourses(@Req() req: any) {
    return await this.enrollmentService.getStudentCourses(req.user.id);
  }

  @Get('referred')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.AFFILIATE)
  async getReferredEnrollments(@Req() req: any) {
    return await this.enrollmentService.getReferredEnrollments(req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return await this.enrollmentService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.enrollmentService.findOne(+id, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    return await this.enrollmentService.remove(+id);
  }
}
