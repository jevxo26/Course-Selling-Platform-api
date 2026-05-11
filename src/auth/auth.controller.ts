import { Controller, Post, UseGuards, Request, Body, Get } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: express.Request) {
    return this.authService.login((req as any).user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: express.Request) {
    return req.user;
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string, @Body('userId') userId: number) {
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: express.Request) {
    return this.authService.logout((req.user as any).id);
  }

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req: express.Request, @Body() body: any) {
    return this.authService.changePassword(
      (req.user as any).id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(@Body('token') token: string, @Body('newPassword') newPass: string) {
    return this.authService.resetPassword(token, newPass);
  }
}
