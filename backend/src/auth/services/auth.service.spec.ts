import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MailService } from '../../mail/mail.service';
import { User } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { Role } from '../roles/roles.enum';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = { getUserByEmail: jest.fn() };
  const jwt = { sign: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [AuthService, { provide: UsersService, useValue: users }, { provide: JwtService, useValue: jwt }, { provide: MailService, useValue: {} }],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('validateUser', () => {
    it('devuelve al usuario cuando la contraseña coincide y el email está verificado', async () => {
      const user = { id: 1, password: await bcrypt.hash('password1', 4), emailVerified: true } as User;
      users.getUserByEmail.mockResolvedValue(user);

      await expect(service.validateUser('a@b.com', 'password1')).resolves.toBe(user);
    });

    it('rechaza con 401 un email inexistente', async () => {
      users.getUserByEmail.mockResolvedValue(null);

      await expect(service.validateUser('x@b.com', 'password1')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 401 una contraseña incorrecta', async () => {
      users.getUserByEmail.mockResolvedValue({ password: await bcrypt.hash('otra', 4), emailVerified: true });

      await expect(service.validateUser('a@b.com', 'password1')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con 403 un email sin verificar aunque la contraseña sea correcta', async () => {
      users.getUserByEmail.mockResolvedValue({ password: await bcrypt.hash('password1', 4), emailVerified: false });

      await expect(service.validateUser('a@b.com', 'password1')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('generateToken firma el payload con sub y role', () => {
    jwt.sign.mockReturnValue('token');

    expect(service.generateToken({ id: 9, role: Role.ADMIN } as User)).toBe('token');
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 9, role: Role.ADMIN });
  });
});
