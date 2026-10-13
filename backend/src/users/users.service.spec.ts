import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { FileStorageService } from '../files/file-storage.service';
import { Role } from '../auth/roles/roles.enum';
import { Profile } from './entities/profile.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const users = { findOne: jest.fn(), find: jest.fn(), create: jest.fn(), save: jest.fn(), merge: jest.fn(), delete: jest.fn() };
  const profiles = { save: jest.fn() };
  const files = { deleteByPublicPath: jest.fn(), buildPublicPath: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: users }, { provide: getRepositoryToken(Profile), useValue: profiles }, { provide: FileStorageService, useValue: files }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('getUserByID lanza NotFoundException si el usuario no existe', async () => {
    users.findOne.mockResolvedValue(null);

    await expect(service.getUserByID(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('create', () => {
    const body = { email: 'a@b.com', password: 'password1', profile: { name: 'A', lastName: 'B' } };

    it('rechaza con 409 un email ya registrado, sin crear nada', async () => {
      users.findOne.mockResolvedValue({ id: 1 });

      await expect(service.create(body)).rejects.toBeInstanceOf(ConflictException);
      expect(users.save).not.toHaveBeenCalled();
    });

    it('traduce la violación de unicidad de la base (23505) a 409', async () => {
      users.findOne.mockResolvedValue(null);
      users.create.mockReturnValue({});
      users.save.mockRejectedValue(new QueryFailedError('INSERT', [], Object.assign(new Error('dup'), { code: '23505' })));

      await expect(service.create(body)).rejects.toBeInstanceOf(ConflictException);
    });

    it('cualquier otra falla al guardar se informa como 400', async () => {
      users.findOne.mockResolvedValue(null);
      users.create.mockReturnValue({});
      users.save.mockRejectedValue(new Error('boom'));

      await expect(service.create(body)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('hashea la contraseña nueva antes de guardarla y no pisa el avatar', async () => {
      users.findOne.mockResolvedValue({ id: 1, profile: {} });
      users.merge.mockImplementation((user: object, changes: object) => ({ ...user, ...changes }));
      users.save.mockImplementation((user: object) => Promise.resolve(user));

      await service.update(1, { password: 'newPassword1', profile: { name: 'N', avatar: '/uploads/x.png' } });

      const merged = (users.merge.mock.calls as [[unknown, { password: string; profile: { avatar?: string } }]])[0][1];
      expect(merged.password).not.toBe('newPassword1');
      expect(merged.password).toMatch(/^\$2[aby]\$/);
      expect(merged.profile.avatar).toBeUndefined();
    });

    it('conserva el NotFoundException cuando el usuario no existe', async () => {
      users.findOne.mockResolvedValue(null);

      await expect(service.update(5, {})).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('updateRole persiste el rol nuevo', async () => {
    const user = { id: 1, role: Role.CLIENT };
    users.findOne.mockResolvedValue(user);
    users.save.mockImplementation((u: object) => Promise.resolve(u));

    await expect(service.updateRole(1, Role.ADMIN)).resolves.toMatchObject({ role: Role.ADMIN });
  });

  describe('imágenes de perfil', () => {
    it('no deja subir una segunda imagen si el perfil ya tiene avatar', async () => {
      users.findOne.mockResolvedValue({ id: 1, profile: { avatar: '/uploads/profiles/a.png' } });

      await expect(service.uploadProfileImage(1, 'b.png')).rejects.toBeInstanceOf(BadRequestException);
      expect(profiles.save).not.toHaveBeenCalled();
    });

    it('guarda la ruta pública construida por FileStorageService', async () => {
      const profile = { avatar: null as string | null };
      users.findOne.mockResolvedValue({ id: 1, profile });
      files.buildPublicPath.mockReturnValue('/uploads/profiles/b.png');
      profiles.save.mockImplementation((p: object) => Promise.resolve(p));

      await expect(service.uploadProfileImage(1, 'b.png')).resolves.toEqual({ userId: 1, imageUrl: '/uploads/profiles/b.png' });
    });

    it('borrar la imagen de un perfil sin avatar da 404', async () => {
      users.findOne.mockResolvedValue({ id: 1, profile: { avatar: null } });

      await expect(service.deleteProfileImage(1)).rejects.toBeInstanceOf(NotFoundException);
      expect(files.deleteByPublicPath).not.toHaveBeenCalled();
    });
  });

  it('los métodos *Token devuelven null sin consultar la base cuando el token viene vacío', async () => {
    await expect(service.findByVerificationToken('')).resolves.toBeNull();
    await expect(service.findByPasswordResetToken('')).resolves.toBeNull();
    expect(users.findOne).not.toHaveBeenCalled();
  });
});
