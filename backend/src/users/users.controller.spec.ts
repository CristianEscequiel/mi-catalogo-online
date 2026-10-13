import { BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Role } from '../auth/roles/roles.enum';
import { SelfOrAdminGuard } from '../auth/roles/self-or-admin.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = {
    findAll: jest.fn(),
    getUserByID: jest.fn(),
    updateRole: jest.fn(),
    uploadProfileImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const allow = { canActivate: () => true };
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue(allow)
      .overrideGuard(RolesGuard)
      .useValue(allow)
      .overrideGuard(SelfOrAdminGuard)
      .useValue(allow)
      .compile();
    controller = moduleRef.get(UsersController);
  });

  it('getUsers devuelve lo que entrega el servicio', async () => {
    usersService.findAll.mockResolvedValue([{ id: 1 }]);

    await expect(controller.getUsers()).resolves.toEqual([{ id: 1 }]);
  });

  it('findUsers pide el usuario por id', async () => {
    usersService.getUserByID.mockResolvedValue({ id: 4 });

    await expect(controller.findUsers(4)).resolves.toEqual({ id: 4 });
    expect(usersService.getUserByID).toHaveBeenCalledWith(4);
  });

  it('updateUserRole pasa el id y el rol del body', async () => {
    usersService.updateRole.mockResolvedValue({ id: 2, role: Role.ADMIN });

    await controller.updateUserRole(2, { role: Role.ADMIN });
    expect(usersService.updateRole).toHaveBeenCalledWith(2, Role.ADMIN);
  });

  it('uploadProfileImage sin archivo responde 400 y no llama al servicio', () => {
    expect(() => controller.uploadProfileImage(1, undefined)).toThrow(BadRequestException);
    expect(usersService.uploadProfileImage).not.toHaveBeenCalled();
  });

  it('uploadProfileImage con archivo delega con el nombre del archivo', async () => {
    usersService.uploadProfileImage.mockResolvedValue({ userId: 1, imageUrl: '/uploads/profiles/f.png' });

    await controller.uploadProfileImage(1, { filename: 'f.png' });
    expect(usersService.uploadProfileImage).toHaveBeenCalledWith(1, 'f.png');
  });
});
