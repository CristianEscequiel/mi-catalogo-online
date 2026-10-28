import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../mail/mail.service';
import { UsersService } from '../../users/users.service';
import { generateOpaqueToken, hashToken } from '../token.util';
import { AuthService } from './auth.service';

describe('AuthService (seguridad de tokens)', () => {
  let service: AuthService;
  const users = {
    create: jest.fn(),
    getUserByEmail: jest.fn(),
    findByVerificationToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    setPasswordResetToken: jest.fn(),
    markEmailAsVerified: jest.fn(),
    saveUser: jest.fn(),
  };
  const mail = { sendVerificationEmail: jest.fn(), sendResetPasswordMail: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: { sign: jest.fn() } },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('register guarda el hash del token y envía el token en claro por email', async () => {
    users.create.mockResolvedValue({});
    await service.register({ email: 'a@b.com', password: 'password1', profile: { name: 'A', lastName: 'B' } });

    const stored = users.create.mock.calls[0][0].verificationToken as string;
    const sent = mail.sendVerificationEmail.mock.calls[0][1] as string;
    expect(sent).toHaveLength(64);
    expect(stored).toBe(hashToken(sent));
    expect(stored).not.toBe(sent);
  });

  it('resetPassword busca por el hash del token, no por el token', async () => {
    users.findByPasswordResetToken.mockResolvedValue(null);
    const token = generateOpaqueToken();

    await expect(service.resetPassword(token, 'newPassword1')).rejects.toBeInstanceOf(BadRequestException);
    expect(users.findByPasswordResetToken).toHaveBeenCalledWith(hashToken(token));
  });

  it('resetPassword rechaza un usuario sin fecha de expiración', async () => {
    users.findByPasswordResetToken.mockResolvedValue({ passwordResetExpiresAt: null });
    await expect(service.resetPassword(generateOpaqueToken(), 'newPassword1')).rejects.toBeInstanceOf(BadRequestException);
    expect(users.saveUser).not.toHaveBeenCalled();
  });

  it('resetPassword hashea la nueva contraseña y limpia el token', async () => {
    const user = { password: 'old', passwordResetToken: 'h', passwordResetExpiresAt: new Date(Date.now() + 60_000) };
    users.findByPasswordResetToken.mockResolvedValue(user);

    await service.resetPassword(generateOpaqueToken(), 'newPassword1');

    expect(await bcrypt.compare('newPassword1', user.password)).toBe(true);
    expect(user.passwordResetToken).toBeNull();
    expect(users.saveUser).toHaveBeenCalledWith(user);
  });

  it('verifyEmail rechaza un token vencido', async () => {
    users.findByVerificationToken.mockResolvedValue({ verificationExpiresAt: new Date(Date.now() - 1000) });
    await expect(service.verifyEmail(generateOpaqueToken())).rejects.toBeInstanceOf(BadRequestException);
    expect(users.markEmailAsVerified).not.toHaveBeenCalled();
  });
});
