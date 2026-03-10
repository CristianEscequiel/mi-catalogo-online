import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { Profile } from './profile.entity';
import { Product } from '../../product/entities/product.entity';
import { Role } from '../../auth/roles/roles.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'User ID',
    example: 1,
    required: true,
  })
  id: number;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({
    description: 'User password (hashed)',
    example: '$2b$10$abcdefghijklmnopqrstuv',
    writeOnly: true,
    required: true,
  })
  password: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @ApiProperty({
    description: 'User email address',
    example: 'ana.gomez@example.com',
    required: true,
  })
  email: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.CLIENT,
    required: true,
  })
  role: Role;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  @ApiProperty({
    description: 'Created at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'User profile',
    type: () => Profile,
    example: {
      id: 1,
      name: 'Ana',
      lastName: 'Gomez',
      avatar: 'https://example.com/avatars/ana.png',
    },
    required: true,
  })
  @OneToOne(() => Profile, { nullable: false, cascade: true })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @ApiProperty({
    description: 'Products created by the user',
    type: () => Product,
    isArray: true,
    example: [
      {
        id: 1,
        name: 'Mechanical Keyboard',
        price: 120,
        description: 'RGB mechanical keyboard',
      },
    ],
    required: true,
  })
  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
