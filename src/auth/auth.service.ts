import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ===========================================================================
  // USER VALIDATION & LOGIN
  // ===========================================================================

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      // Check if user is banned
      const fullUser = await this.usersService.findOne(user.id);
      if (fullUser && fullUser.isBanned) {
        throw new ForbiddenException(
          `Your account is banned. Reason: ${fullUser.banReason || 'No reason provided'}`,
        );
      }

      if (await bcrypt.compare(pass, user.password)) {
        const { password, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'defaultRefreshSecret',
      expiresIn: '7d',
    });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        country: user.country,
        photo: user.photo,
        referCode: user.referCode,
      },
    };
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  async refreshTokens(userId: number, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access Denied');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'defaultRefreshSecret',
      expiresIn: '7d',
    });

    await this.usersService.updateRefreshToken(user.id, newRefreshToken);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: number) {
    return this.usersService.updateRefreshToken(userId, null);
  }

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  async changePassword(userId: number, oldPass: string, newPass: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException();

    const userWithPass = await this.usersService.findByEmail(user.email);
    if (!userWithPass || !userWithPass.password) {
      throw new UnauthorizedException();
    }

    const isMatch = await bcrypt.compare(oldPass, userWithPass.password);
    if (!isMatch) throw new UnauthorizedException('Invalid current password');

    const hashedNewPass = await bcrypt.hash(newPass, 10);
    await this.usersService.updatePassword(userId, hashedNewPass);
    return { message: 'Password updated successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'If an account exists with this email, you will receive a reset link.' };
    }

    const token =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.updateResetToken(user.id, token, expires);

    return {
      message: 'Reset token generated',
      resetToken: token,
    };
  }

  async resetPassword(token: string, newPass: string) {
    const user = await this.usersService.findByResetToken(token);
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const hashedNewPass = await bcrypt.hash(newPass, 10);
    await this.usersService.updatePassword(user.id, hashedNewPass);
    await this.usersService.updateResetToken(user.id, null, null);

    return { message: 'Password has been reset successfully' };
  }
}
