import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { instanceToPlain, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../users/entities/user.entity';
import { RegisterDto } from './register.dto';
import { ResetPasswordDto } from './reset-password.dto';
import { VerifyEmailDto } from './verify-email.dto';

const validToken = 'a'.repeat(64);

describe('DTOs de auth', () => {
  it('reset-password sin token es inválido (antes reseteaba al primer usuario)', async () => {
    const dto = plainToInstance(ResetPasswordDto, { newPassword: 'newPassword1' });
    expect((await validate(dto)).some((e) => e.property === 'token')).toBe(true);
  });

  it('reset-password rechaza token no hexadecimal, corto o contraseña corta', async () => {
    for (const body of [
      { token: 'zz'.repeat(32), newPassword: 'newPassword1' },
      { token: 'abc', newPassword: 'newPassword1' },
      { token: validToken, newPassword: 'short' },
    ]) {
      expect((await validate(plainToInstance(ResetPasswordDto, body))).length).toBeGreaterThan(0);
    }
  });

  it('reset-password acepta un token y contraseña válidos', async () => {
    expect(await validate(plainToInstance(ResetPasswordDto, { token: validToken, newPassword: 'newPassword1' }))).toHaveLength(0);
  });

  it('verify-email sin token es inválido', async () => {
    expect((await validate(plainToInstance(VerifyEmailDto, {}))).length).toBeGreaterThan(0);
  });

  it('register rechaza emailVerified, tokens y role (mismo ValidationPipe que main.ts)', async () => {
    const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
    const base = { email: 'a@b.com', password: 'password1', profile: { name: 'A', lastName: 'B' } };
    const meta = { type: 'body' as const, metatype: RegisterDto };

    await expect(pipe.transform(base, meta)).resolves.toBeDefined();
    for (const extra of [{ emailVerified: true }, { role: 'ADMIN' }, { verificationToken: 'x' }, { passwordResetToken: 'x' }]) {
      await expect(pipe.transform({ ...base, ...extra }, meta)).rejects.toBeInstanceOf(BadRequestException);
    }
  });
});

describe('Serialización', () => {
  const user = Object.assign(new User(), {
    id: 1,
    email: 'admin@x.com',
    role: 'ADMIN',
    password: 'hash',
    verificationToken: 'v',
    verificationExpiresAt: new Date(),
    passwordResetToken: 'r',
    passwordResetExpiresAt: new Date(),
    profile: { name: 'Ana', lastName: 'Gomez', avatar: null },
  });

  it('User no expone password ni tokens', () => {
    const plain = instanceToPlain(user);
    for (const key of ['password', 'verificationToken', 'verificationExpiresAt', 'passwordResetToken', 'passwordResetExpiresAt']) {
      expect(plain).not.toHaveProperty(key);
    }
  });

  it('Product solo expone id y perfil público del dueño', () => {
    const product = Object.assign(new Product(), { id: 5, name: 'P', user });
    const plain = instanceToPlain(product) as { user: Record<string, unknown> };
    expect(plain.user).toEqual({ id: 1, profile: { name: 'Ana', lastName: 'Gomez', avatar: null } });
    expect(JSON.stringify(plain)).not.toMatch(/admin@x\.com|passwordResetToken|ADMIN/);
  });
});
