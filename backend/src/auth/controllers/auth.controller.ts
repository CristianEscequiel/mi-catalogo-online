import { Body, Controller, UseGuards, Post, Request, Query, Get, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from '../services/auth.service';
import { User } from 'src/users/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { ResendVerificationEmailDto } from '../dto/resend-verification-email.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';

// Límite por IP en todo /auth para frenar fuerza bruta y spam de mails.
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @UseGuards(AuthGuard('local'))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Request() req: { user: User }) {
    const user = req.user;
    return {
      user,
      access_token: this.authService.generateToken(user),
    };
  }

  // POST (no GET): el email no debe quedar en la query string ni en los logs del proxy.
  @Post('request-password-reset')
  @HttpCode(200)
  async requestPasswordReset(@Body() body: RequestPasswordResetDto) {
    return await this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('verify-email')
  verifyEmail(@Query() query: VerifyEmailDto) {
    return this.authService.verifyEmail(query.token);
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
