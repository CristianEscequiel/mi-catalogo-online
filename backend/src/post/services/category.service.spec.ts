import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryService } from './category.service';
import { Category } from '../entities/category.entity';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<Repository<Category>>;

  beforeEach(async () => {
    const repositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Category>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(Category),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(getRepositoryToken(Category));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a category', async () => {
    const dto = { name: 'Tech' };
    const created = { id: 1, name: 'Tech' } as Category;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('throws BadRequestException when create fails', async () => {
    repository.create.mockReturnValue({} as Category);
    repository.save.mockRejectedValue(new Error('db'));

    await expect(service.create({ name: 'Tech' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns all categories', async () => {
    const categories = [{ id: 1 }] as Category[];
    repository.find.mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toEqual(categories);
  });

  it('returns a category by id', async () => {
    const category = { id: 1 } as Category;
    repository.findOne.mockResolvedValue(category);

    await expect(service.findOne(1)).resolves.toEqual(category);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('throws NotFoundException when category is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a category', async () => {
    const category = { id: 1, name: 'Old' } as Category;
    const merged = { id: 1, name: 'New' } as Category;
    repository.findOne.mockResolvedValue(category);
    repository.merge.mockReturnValue(merged);
    repository.save.mockResolvedValue(merged);

    await expect(service.update(1, { name: 'New' })).resolves.toEqual(merged);
    expect(repository.merge).toHaveBeenCalledWith(category, { name: 'New' });
    expect(repository.save).toHaveBeenCalledWith(merged);
  });

  it('throws BadRequestException when update fails', async () => {
    const category = { id: 1 } as Category;
    repository.findOne.mockResolvedValue(category);
    repository.merge.mockReturnValue(category);
    repository.save.mockRejectedValue(new Error('db'));

    await expect(service.update(1, { name: 'New' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a category', async () => {
    const category = { id: 1 } as Category;
    repository.findOne.mockResolvedValue(category);
    repository.delete.mockResolvedValue({} as any);

    await expect(service.remove(1)).resolves.toEqual({ message: 'Category deleted' });
    expect(repository.delete).toHaveBeenCalledWith(1);
  });

  it('throws NotFoundException when removing missing category', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
