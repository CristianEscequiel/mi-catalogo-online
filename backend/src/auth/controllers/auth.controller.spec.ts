import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { User } from '../../users/entities/user.entity';
import { AuthService } from '../services/auth.service';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    generateToken: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('REQ-1.4: login devuelve el usuario autenticado y el token firmado por el servicio', () => {
    const user = { id: 3, email: 'a@b.com' } as User;
    authService.generateToken.mockReturnValue('jwt-firmado');

    expect(controller.login(user)).toEqual({ user, access_token: 'jwt-firmado' });
    expect(authService.generateToken).toHaveBeenCalledWith(user);
  });

  it('register delega en el servicio con el body y devuelve su respuesta', async () => {
    const body = { email: 'a@b.com', password: 'password1', profile: { name: 'A', lastName: 'B' } };
    authService.register.mockResolvedValue({ message: 'ok' });

    await expect(controller.register(body)).resolves.toEqual({ message: 'ok' });
    expect(authService.register).toHaveBeenCalledWith(body);
  });

  it('resetPassword pasa token y contraseña nueva al servicio', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

    await controller.resetPassword({ token: 't', newPassword: 'newPassword1' });
    expect(authService.resetPassword).toHaveBeenCalledWith('t', 'newPassword1');
  });

  it('verifyEmail propaga el error del servicio', async () => {
    authService.verifyEmail.mockRejectedValue(new Error('Invalid verification token'));

    await expect(controller.verifyEmail({ token: 'malo' })).rejects.toThrow('Invalid verification token');
  });
});
