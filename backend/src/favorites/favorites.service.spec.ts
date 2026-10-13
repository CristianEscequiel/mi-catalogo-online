import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { Status } from '../product/models/status.enum';
import { Favorite } from './entities/favorite.entity';
import { FavoritesService } from './favorites.service';

describe('FavoritesService (solo productos publicados)', () => {
  let service: FavoritesService;
  const favoritesRepository = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
  const productsRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [FavoritesService, { provide: getRepositoryToken(Favorite), useValue: favoritesRepository }, { provide: getRepositoryToken(Product), useValue: productsRepository }],
    }).compile();
    service = moduleRef.get(FavoritesService);
  });

  it('agregar un producto DRAFT/ARCHIVED responde 404 y no crea el favorito (REQ-1.5)', async () => {
    productsRepository.findOne.mockResolvedValue(null); // el where con status PUBLISHED no lo encuentra

    await expect(service.add(1, 5)).rejects.toBeInstanceOf(NotFoundException);

    expect(productsRepository.findOne).toHaveBeenCalledWith({ where: { id: 5, status: Status.PUBLISHED } });
    expect(favoritesRepository.save).not.toHaveBeenCalled();
  });

  it('el listado pide solo productos PUBLISHED (REQ-1.6)', async () => {
    favoritesRepository.find.mockResolvedValue([{ product: { id: 1 } }]);

    expect(await service.findAllByUser(3)).toEqual([{ id: 1 }]);

    expect(favoritesRepository.find).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 3, product: { status: Status.PUBLISHED } } }));
  });
});
