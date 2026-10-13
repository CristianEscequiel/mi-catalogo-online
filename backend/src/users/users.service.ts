import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { Role } from '../auth/roles/roles.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ImageStorage } from 'src/files/image-storage.port';
import { UPLOAD_FOLDERS } from 'src/files/file.constants';

// Datos de alta que solo puede fijar el servidor (flujo de verificación de email).
// Nunca se exponen en un DTO HTTP.
export interface CreateUserData extends CreateUserDto {
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationExpiresAt?: Date | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Profile)
    private profilesRepository: Repository<Profile>,
    private readonly fileStorageService: ImageStorage,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['profile'],
    });
    return users;
  }
  async getUserByID(id: number) {
    return this.findOne(id);
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

  async create(body: CreateUserData) {
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
        // @BeforeInsert solo hashea al crear: al actualizar hay que hashear a mano.
        password: changes.password ? await bcrypt.hash(changes.password, 10) : undefined,
        profile: sanitizedProfile,
      });
      const saveUser = await this.usersRepository.save(updatedUser);
      return saveUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error updating user');
    }
  }

  async updateRole(id: number, role: Role) {
    const user = await this.findOne(id);
    user.role = role;
    return this.usersRepository.save(user);
  }
  async delete(id: number) {
    const user = await this.findOne(id);
    await this.fileStorageService.deleteByPublicPath(user.profile?.avatar);
    await this.usersRepository.delete(user.id);
    return { message: 'User deleted' };
  }
  async saveUser(user: User) {
    try {
      return await this.usersRepository.save(user);
    } catch {
      throw new BadRequestException('Error saving user');
    }
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
  // Los métodos *Token reciben el hash. Con un valor vacío/undefined TypeORM ignora la condición
  // y devolvería el primer usuario de la tabla, así que se corta antes de consultar.
  async findByVerificationToken(token: string) {
    if (!token) return null;
    return this.usersRepository.findOne({
      where: { verificationToken: token },
    });
  }
  async markEmailAsVerified(user: User) {
    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationExpiresAt = null;

    return this.usersRepository.save(user);
  }

  async setPasswordResetToken(userId: number, token: string, expiresAt: Date) {
    const user = await this.findOne(userId);
    user.passwordResetToken = token;
    user.passwordResetExpiresAt = expiresAt;
    await this.usersRepository.save(user);
  }

  async findByPasswordResetToken(token: string) {
    if (!token) return null;
    return this.usersRepository.findOne({
      where: { passwordResetToken: token },
    });
  }
}
