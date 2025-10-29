import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostService } from './post.service';
import { Post } from './entities/post.entity';

describe('PostService', () => {
  let service: PostService;
  let repository: jest.Mocked<Repository<Post>>;

  beforeEach(async () => {
    const repositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<Post>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: getRepositoryToken(Post),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<PostService>(PostService);
    repository = module.get(getRepositoryToken(Post));
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a post', async () => {
    const dto = { title: 'Hello' } as any;
    const created = { id: 1, title: 'Hello' } as Post;
    repository.create.mockReturnValue(created);
    repository.save.mockResolvedValue(created);

    await expect(service.create(dto)).resolves.toEqual(created);
    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(repository.save).toHaveBeenCalledWith(created);
  });

  it('throws BadRequestException when create fails', async () => {
    repository.create.mockReturnValue({} as Post);
    repository.save.mockRejectedValue(new Error('db'));

    await expect(service.create({} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns all posts', async () => {
    const posts = [{ id: 1 }] as Post[];
    repository.find.mockResolvedValue(posts);

    await expect(service.findAll()).resolves.toEqual(posts);
    expect(repository.find).toHaveBeenCalled();
  });

  it('returns a post by id', async () => {
    const post = { id: 1 } as Post;
    repository.findOne.mockResolvedValue(post);

    await expect(service.findOne(1)).resolves.toEqual(post);
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('throws NotFoundException when post is missing', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates a post', async () => {
    const post = { id: 1, title: 'Old' } as Post;
    const merged = { id: 1, title: 'New' } as Post;
    repository.findOne.mockResolvedValue(post);
    repository.merge.mockReturnValue(merged);
    repository.save.mockResolvedValue(merged);

    await expect(service.update(1, { title: 'New' } as any)).resolves.toEqual(merged);
    expect(repository.merge).toHaveBeenCalledWith(post, { title: 'New' });
    expect(repository.save).toHaveBeenCalledWith(merged);
  });

  it('throws BadRequestException when update fails', async () => {
    const post = { id: 1 } as Post;
    repository.findOne.mockResolvedValue(post);
    repository.merge.mockReturnValue(post);
    repository.save.mockRejectedValue(new Error('db'));

    await expect(service.update(1, {} as any)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removes a post', async () => {
    const post = { id: 1 } as Post;
    repository.findOne.mockResolvedValue(post);
    repository.delete.mockResolvedValue({} as any);

    await expect(service.remove(1)).resolves.toEqual({ message: 'Post deleted' });
    expect(repository.delete).toHaveBeenCalledWith(1);
  });

  it('throws NotFoundException when removing missing post', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
