import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './category.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../models/status.enum';

@Entity({
  name: 'products',
})
export class Product {
  @ApiProperty({
    description: 'The ID number of the product',
    example: 1,
    required: true,
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'The name of the product',
    example: 'Mechanical Keyboard',
    required: true,
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiPropertyOptional({
    description: 'URL-friendly slug for the product',
    example: 'mechanical-keyboard',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string;

  @ApiPropertyOptional({
    description: 'The description of the product',
    example: 'RGB mechanical keyboard',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiPropertyOptional({
    description: 'Stock keeping unit (SKU)',
    example: 'MK-001',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  sku: string;

  @ApiPropertyOptional({
    description: 'Product price',
    example: 120,
  })
  @Column({ type: 'float', nullable: true })
  price: number;

  @ApiProperty({ description: 'The Stock of the product' })
  @Column({ type: 'int', nullable: true, default: 0 })
  stock: number;

  @ApiProperty({ description: 'The reserved Stock of the product' })
  @Column({ type: 'int', nullable: true, default: 0 })
  reservedStock: number;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://example.com/images/keyboard.png',
  })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @ApiProperty({
    description: 'Product status',
    enum: Status,
    example: Status.DRAFT,
    required: true,
  })
  @Column({ type: 'enum', enum: Status, default: Status.DRAFT })
  status: Status;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Owner user',
    type: () => User,
    example: {
      id: 1,
      email: 'ana.gomez@example.com',
      role: 'CLIENT',
    },
    required: true,
  })
  @ManyToOne(() => User, (user) => user.products, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    description: 'Categories assigned to the product',
    type: () => Category,
    isArray: true,
    example: [
      {
        id: 1,
        name: 'Keyboards',
        description: 'Mechanical keyboards and accessories',
        imageUrl: 'https://example.com/images/categories/keyboards.png',
      },
    ],
    required: true,
  })
  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];
}
