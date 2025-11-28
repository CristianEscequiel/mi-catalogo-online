import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['profile'],
    });
    return users;
  }
  async getUserByID(id: number) {
    const user = await this.findOne(id);
    if (user.id === 1) {
      throw new ForbiddenException('You are not alloewd acces this user');
    }
    return user;
  }
  async getProfileByUserId(id: number) {
    const user = await this.findOne(id);
    return user.profile;
  }

  async getPostsByUserId(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user.products;
  }

  async create(body: CreateUserDto) {
    try {
      const newUser = this.usersRepository.create(body);
      const savedUser = await this.usersRepository.save(newUser);
      return this.findOne(savedUser.id);
    } catch {
      throw new BadRequestException('Error creating user');
    }
  }
  async update(id: number, changes: UpdateUserDto) {
    try {
      const user = await this.findOne(id);
      const updatedUser = this.usersRepository.merge(user, changes);
      const saveUser = await this.usersRepository.save(updatedUser);
      return saveUser;
    } catch {
      throw new BadRequestException('Error updating user');
    }
  }
  async delete(id: number) {
    const user = await this.findOne(id);
    await this.usersRepository.delete(user.id);
    return { message: 'User deleted' };
  }

  private async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['profile', 'products'],
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
