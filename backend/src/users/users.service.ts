import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { FileStorageService } from 'src/files/file-storage.service';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    private readonly fileStorageService: FileStorageService,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['profile'],
    });
    return users;
  }
  async getUserByID(id: number) {
    const user = await this.findOne(id);
    if (user.id === 9) {
      throw new ForbiddenException('You are not alloewd acces this user');
    }
    return user;
  }

  async getProfileByUserId(id: number) {
    const user = await this.findOne(id);
    return user.profile;
  }

  async getPorductsByUserId(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['products', 'products.categories'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user.products;
  }

  async getCategoriesByUserId(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['categories'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user.categories;
  }

  async create(body: CreateUserDto) {
    const existingUser = await this.getUserByEmail(body.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    try {
      const newUser = this.usersRepository.create(body);
      const savedUser = await this.usersRepository.save(newUser);
      return this.findOne(savedUser.id);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new ConflictException('Email already registered');
      }
      throw new BadRequestException('Error creating user');
    }
  }
  async update(id: number, changes: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      const sanitizedProfile = changes.profile
        ? {
            ...changes.profile,
            avatar: undefined,
          }
        : undefined;

      const updatedUser = this.usersRepository.merge(user, {
        ...changes,
        profile: sanitizedProfile,
      });
      const saveUser = await this.usersRepository.save(updatedUser);
      return saveUser;
    } catch {
      throw new BadRequestException('Error updating user');
    }
  }
  async delete(id: number) {
    const user = await this.findOne(id);
    await this.fileStorageService.deleteByPublicPath(user.profile?.avatar);
    await this.usersRepository.delete(user.id);
    return { message: 'User deleted' };
  }

  async uploadProfileImage(id: number, filename: string) {
    const user = await this.findOne(id);
    if (user.profile.avatar) {
      throw new BadRequestException('Profile already has an image. Delete it before uploading a new one.');
    }

    user.profile.avatar = this.fileStorageService.buildPublicPath(UPLOAD_FOLDERS.profiles, filename);
    const savedProfile = await this.profilesRepository.save(user.profile);

    return {
      userId: user.id,
      imageUrl: savedProfile.avatar,
    };
  }

  async deleteProfileImage(id: number) {
    const user = await this.findOne(id);
    if (!user.profile.avatar) {
      throw new NotFoundException('Profile has no image to delete');
    }

    await this.fileStorageService.deleteByPublicPath(user.profile.avatar);
    user.profile.avatar = null;
    const savedProfile = await this.profilesRepository.save(user.profile);

    return {
      userId: user.id,
      imageUrl: savedProfile.avatar,
    };
  }

  private async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile', 'products', 'categories'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async getUserByEmail(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
    });
    return user;
  }
}
