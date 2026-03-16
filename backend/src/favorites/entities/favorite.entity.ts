import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'favorites' })
@Index('IDX_favorites_user_product', ['userId', 'productId'], { unique: true })
export class Favorite {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Favorite ID',
    example: 1,
    required: true,
  })
  id: number;

  @ApiProperty({
    description: 'User ID that owns the favorite',
    example: 1,
    required: true,
  })
  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ApiProperty({
    description: 'Product ID marked as favorite',
    example: 2,
    required: true,
  })
  @Column({ name: 'product_id', type: 'int' })
  productId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;
}
