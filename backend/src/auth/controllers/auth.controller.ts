/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, UseGuards, Post, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import { User } from 'src/users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
