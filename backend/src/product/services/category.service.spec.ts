import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payload } from '../../auth/models/payload.model';
import { FileStorageService } from '../../files/file-storage.service';
import { Category } from '../entities/category.entity';
import { CategoryService } from './category.service';

const admin: Payload = { sub: 1, role: 'ADMIN' };
const owner: Payload = { sub: 7, role: 'GUEST' };
const stranger: Payload = { sub: 8, role: 'GUEST' };

describe('CategoryService (propiedad, REQ-3)', () => {
  let service: CategoryService;
  const repository = { findOne: jest.fn(), save: jest.fn(), merge: jest.fn(), delete: jest.fn() };
  const files = { buildPublicPath: jest.fn((folder: string, name: string) => `/uploads/${folder}/${name}`), deleteByPublicPath: jest.fn() };
  // con loadRelationIds la relación `user` llega como id numérico
  const category = (ownerId: number | null) => ({ id: 3, name: 'Teclados', imageUrl: '/uploads/categories/old.png', user: ownerId });

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.merge.mockImplementation((entity: object, changes: object) => Object.assign(entity, changes));
    repository.save.mockImplementation((entity: object) => Promise.resolve(entity));
    const moduleRef = await Test.createTestingModule({
      providers: [CategoryService, { provide: getRepositoryToken(Category), useValue: repository }, { provide: FileStorageService, useValue: files }],
    }).compile();
    service = moduleRef.get(CategoryService);
  });

  it.each([
    ['update', (actor: Payload) => service.update(3, { name: 'x' }, actor)],
    ['remove', (actor: Payload) => service.remove(3, actor)],
    ['uploadImage', (actor: Payload) => service.uploadImage(3, 'new.png', actor)],
    ['deleteImage', (actor: Payload) => service.deleteImage(3, actor)],
  ])('%s: un GUEST ajeno recibe 403 sin guardar ni borrar nada (REQ-3.2)', async (_name, run) => {
    repository.findOne.mockResolvedValue(category(7));

    await expect(run(stranger)).rejects.toBeInstanceOf(ForbiddenException);

    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
    expect(files.deleteByPublicPath).not.toHaveBeenCalledWith('/uploads/categories/old.png');
  });

  it('uploadImage rechazado borra el archivo recién subido (REQ-3.7)', async () => {
    repository.findOne.mockResolvedValue(category(7));

    await expect(service.uploadImage(3, 'new.png', stranger)).rejects.toBeInstanceOf(ForbiddenException);

    expect(files.deleteByPublicPath).toHaveBeenCalledWith('/uploads/categories/new.png');
  });

  it('el dueño y el ADMIN pueden editar (REQ-3.3, 3.4)', async () => {
    repository.findOne.mockResolvedValue(category(7));
    await expect(service.update(3, { name: 'Nuevo' }, owner)).resolves.toMatchObject({ name: 'Nuevo' });

    repository.findOne.mockResolvedValue(category(7));
    await expect(service.update(3, { name: 'Otro' }, admin)).resolves.toMatchObject({ name: 'Otro' });
  });

  it('la respuesta no incluye al dueño', async () => {
    repository.findOne.mockResolvedValue(category(7));

    expect(await service.update(3, { name: 'Nuevo' }, owner)).not.toHaveProperty('user');
  });

  it('una categoría sin dueño solo la modifica un ADMIN', async () => {
    repository.findOne.mockResolvedValue(category(null));
    await expect(service.remove(3, owner)).rejects.toBeInstanceOf(ForbiddenException);

    repository.findOne.mockResolvedValue(category(null));
    await expect(service.remove(3, admin)).resolves.toEqual({ message: 'Category deleted' });
  });

  it('categoría inexistente → 404 para ADMIN y GUEST (REQ-3.5)', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(3, admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(3, owner)).rejects.toBeInstanceOf(NotFoundException);
  });
});
