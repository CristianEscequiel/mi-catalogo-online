/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Body, Controller, UseGuards, Post, Request, Query, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { User } from 'src/users/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationEmailDto } from '../dto/resend-verification-email.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const user = req.user as User;
    return {
      user,
      access_token: this.authService.generateToken(user),
    };
  }
  @Get('request-password-reset')
  async requestPasswordReset(@Query('email') email: string) {
    return await this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('verify-email')
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  resendVerificationEmail(@Body() body: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Post('resend-verification-email')
  resendVerificationEmailLegacy(@Body() body: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(body.email);
  }
}
