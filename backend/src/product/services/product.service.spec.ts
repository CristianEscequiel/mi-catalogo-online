import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payload } from '../../auth/models/payload.model';
import { FileStorageService } from '../../files/file-storage.service';
import { ListProductsQueryDto } from '../dto/list-products-query.dto';
import { Product } from '../entities/product.entity';
import { Status } from '../models/status.enum';
import { ProductService } from './product.service';

const admin: Payload = { sub: 1, role: 'ADMIN' };
const owner: Payload = { sub: 7, role: 'GUEST' };
const stranger: Payload = { sub: 8, role: 'GUEST' };

const query = (extra: Partial<ListProductsQueryDto> = {}) => Object.assign(new ListProductsQueryDto(), extra);

describe('ProductService', () => {
  let service: ProductService;
  const qb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  const repository = { createQueryBuilder: jest.fn(), find: jest.fn(), findOne: jest.fn(), save: jest.fn(), merge: jest.fn(), delete: jest.fn() };
  const files = { buildPublicPath: jest.fn((folder: string, name: string) => `/uploads/${folder}/${name}`), deleteByPublicPath: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.createQueryBuilder.mockReturnValue(qb);
    const moduleRef = await Test.createTestingModule({
      providers: [ProductService, { provide: getRepositoryToken(Product), useValue: repository }, { provide: FileStorageService, useValue: files }],
    }).compile();
    service = moduleRef.get(ProductService);
  });

  describe('findPublicPage', () => {
    it('solo trae PUBLISHED, ordena del más nuevo al más antiguo y calcula totalPages (REQ-1.1, 2.1, 2.9)', async () => {
      qb.getManyAndCount.mockResolvedValue([[{ id: 1 }], 25]);

      const page = await service.findPublicPage(query({ page: 3, limit: 10 }));

      expect(qb.where).toHaveBeenCalledWith('p.status = :status', { status: Status.PUBLISHED });
      expect(qb.orderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('p.id', 'DESC');
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(page).toEqual({ items: [{ id: 1 }], total: 25, page: 3, limit: 10, totalPages: 3 });
    });

    it('sin resultados: totalPages 0 (REQ-2.11)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      expect((await service.findPublicPage(query())).totalPages).toBe(0);
    });

    it('escapa los comodines del texto buscado (REQ-2.4)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findPublicPage(query({ search: '50%_x' }));

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { q: '%50\\%\\_x%' });
    });

    it('filtra categoría con EXISTS para no recortar las categorías del producto (REQ-2.6)', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findPublicPage(query({ categoryId: 4 }));

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('EXISTS'), { categoryId: 4 });
    });

    it('sin search ni categoryId no agrega filtros extra', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findPublicPage(query());

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('lecturas públicas solo PUBLISHED', () => {
    it('findPublishedById pide status PUBLISHED y responde 404 si no lo encuentra (REQ-1.2)', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findPublishedById(3)).rejects.toBeInstanceOf(NotFoundException);

      expect(repository.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3, status: Status.PUBLISHED } }));
    });

    it('findOneBySlug pide status PUBLISHED (REQ-1.2)', async () => {
      repository.find.mockResolvedValue([{ id: 1 }]);

      await service.findOneBySlug(' teclado ');

      expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'teclado', status: Status.PUBLISHED } }));
    });

    it('findPublishedByUserId devuelve [] sin lanzar si no hay productos (REQ-1.3)', async () => {
      repository.find.mockResolvedValue([]);

      expect(await service.findPublishedByUserId(9)).toEqual([]);
      expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { user: { id: 9 }, status: Status.PUBLISHED } }));
    });

    it('findProductByCategoryId pide status PUBLISHED (REQ-1.4)', async () => {
      repository.find.mockResolvedValue([]);

      await service.findProductByCategoryId(2);

      expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { categories: { id: 2 }, status: Status.PUBLISHED } }));
    });
  });

  describe('propiedad (REQ-3)', () => {
    const product = { id: 5, thumbnailUrl: '/uploads/products/old.png', user: { id: 7 } };

    beforeEach(() => repository.findOne.mockResolvedValue(product));

    it.each([
      ['update', (actor: Payload) => service.update(5, { name: 'x' }, actor)],
      ['remove', (actor: Payload) => service.remove(5, actor)],
      ['uploadImage', (actor: Payload) => service.uploadImage(5, 'new.png', actor)],
      ['deleteImage', (actor: Payload) => service.deleteImage(5, actor)],
    ])('%s: un GUEST ajeno recibe 403 sin guardar ni borrar nada (REQ-3.1)', async (_name, run) => {
      await expect(run(stranger)).rejects.toBeInstanceOf(ForbiddenException);

      expect(repository.save).not.toHaveBeenCalled();
      expect(repository.delete).not.toHaveBeenCalled();
      expect(files.deleteByPublicPath).not.toHaveBeenCalledWith(product.thumbnailUrl);
    });

    it('uploadImage rechazado borra el archivo recién subido, no el existente (REQ-3.7)', async () => {
      await expect(service.uploadImage(5, 'new.png', stranger)).rejects.toBeInstanceOf(ForbiddenException);

      expect(files.deleteByPublicPath).toHaveBeenCalledTimes(1);
      expect(files.deleteByPublicPath).toHaveBeenCalledWith('/uploads/products/new.png');
    });

    it('el dueño y el ADMIN pueden borrar (REQ-3.3, 3.4)', async () => {
      await expect(service.remove(5, owner)).resolves.toEqual({ message: 'Product deleted' });
      await expect(service.remove(5, admin)).resolves.toEqual({ message: 'Product deleted' });
      expect(repository.delete).toHaveBeenCalledTimes(2);
    });

    it('producto inexistente → 404 para ADMIN y GUEST (REQ-3.5)', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(5, admin)).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.remove(5, owner)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
