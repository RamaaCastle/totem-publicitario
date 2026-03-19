import {
  Controller, Post, Get, Body, Req, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/permissions.decorator';
import { User } from '../../database/entities/user.entity';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // stricter limit for login
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    return this.authService.login(dto, ipAddress);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.userId, dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@CurrentUser() user: User, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress;
    await this.authService.logout(user.id, ipAddress);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with 6-digit code' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.email, dto.code);
    return { message: 'Cuenta activada correctamente' };
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification code' })
  async resendVerification(@Body('email') email: string) {
    await this.authService.resendVerificationCode(email);
    return { message: 'Si el email existe, recibirás un nuevo código' };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: User) {
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
    return { message: 'Contraseña actualizada correctamente' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.authService.getProfile(user.id);
  }
}
