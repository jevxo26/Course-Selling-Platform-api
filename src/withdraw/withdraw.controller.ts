import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Delete,
} from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { ApproveWithdrawDto } from './dto/approve-withdraw.dto';
import { DirectWithdrawDto } from './dto/direct-withdraw.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { WithdrawStatus } from './entities/withdraw.entity';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Get('live')
  findPublicLive() {
    return this.withdrawService.findPublicLive();
  }

  @Get('live-earning')
  findPublicLiveEarning() {
    return this.withdrawService.findPublicLiveEarning();
  }

  @Post('request')
  @UseGuards(JwtAuthGuard, RolesGuard)
  requestWithdrawal(@Request() req: any, @Body() createWithdrawDto: CreateWithdrawDto) {
    return this.withdrawService.requestWithdrawal(req.user.id, createWithdrawDto);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approveWithdrawal(@Param('id') id: string, @Body() approveWithdrawDto: ApproveWithdrawDto) {
    return this.withdrawService.approveWithdrawal(+id, approveWithdrawDto.percentageId);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectWithdrawal(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.withdrawService.rejectWithdrawal(+id, body.reason);
  }

  @Post('direct')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  directWithdrawal(@Body() directWithdrawDto: DirectWithdrawDto) {
    return this.withdrawService.directWithdrawal(directWithdrawDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  findAll(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('status') status?: WithdrawStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.withdrawService.findAll(req.user, {
      search,
      status,
      page,
      limit,
    });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findMyWithdrawals(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('status') status?: WithdrawStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.withdrawService.findOnlyMy(req.user, {
      search,
      status,
      page,
      limit,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  findOne(@Param('id') id: string) {
    return this.withdrawService.findOne(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.withdrawService.remove(+id, req.user);
  }
}
