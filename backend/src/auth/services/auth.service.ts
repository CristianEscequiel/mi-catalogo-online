import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../users/entities/user.entity';
import { Payload } from '../models/payload.model';
import { RegisterDto } from '../dto/register.dto';
import { Role } from '../roles/roles.enum';
import { MailService } from 'src/mail/mail.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.getUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Unauthorized');
    }
    const emailVerified = user.emailVerified;
    if (!emailVerified) {
      throw new ForbiddenException('Email not verified');
    }
    return user;
  }

  generateToken(user: User) {
    const payload: Payload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }

  async register(registerDto: RegisterDto) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.usersService.create({
      ...registerDto,
      role: Role.CLIENT,
      verificationToken: verificationToken,
      verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // Token válido por 15 minutos
    });
    // this.mailService.sendMail(registerDto.email, 'Verifica tu cuenta', `Tu token de verificación es: ${verificationToken}`);
    await this.mailService.sendVerificationEmail(registerDto.email, verificationToken);
    return {
      message: 'Usuario registrado. Verifica tu correo para activar la cuenta.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.verificationExpiresAt && user.verificationExpiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }
    await this.usersService.markEmailAsVerified(user);
    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string) {
    const genericMessage = 'Si el correo corresponde a una cuenta pendiente de verificacion, te enviamos un nuevo email.';
    const user = await this.usersService.getUserByEmail(email);

    if (!user || user.emailVerified) {
      return {
        message: genericMessage,
      };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await this.usersService.saveUser(user);

    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return {
      message: genericMessage,
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.getUserByEmail(email);
    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      await this.usersService.setPasswordResetToken(user.id, resetToken, new Date(Date.now() + 15 * 60 * 1000));

      await this.mailService.sendResetPasswordMail(email, 'Password Reset', resetToken);
    }
  }
  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;

    await this.usersService.saveUser(user);

    return { message: 'Password reset successfully' };
  }
}
