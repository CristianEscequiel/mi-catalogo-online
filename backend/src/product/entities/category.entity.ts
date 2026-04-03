import { Column, CreateDateColumn, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';

@Entity({
  name: 'categories',
})
export class Category {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Category ID',
    example: 1,
    required: true,
  })
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @ApiProperty({
    description: 'Category name',
    example: 'Keyboards',
    required: true,
  })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @ApiPropertyOptional({
    description: 'Short category description',
    example: 'Mechanical keyboards and accessories',
  })
  description: string;

  @Column({ type: 'varchar', length: 800, nullable: true, name: 'image_url' })
  @ApiPropertyOptional({
    description: 'Category image URL',
    example: 'https://example.com/images/categories/keyboards.png',
  })
  imageUrl: string | null;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({
    description: 'Created at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  createAt: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  updateAt: Date;

  @ApiProperty({
    description: 'Products in this category',
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
  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];

  @ManyToOne(() => User, (user) => user.categories, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
