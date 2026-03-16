import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'cart_items' })
@Index('IDX_cart_items_user', ['userId'])
@Index('IDX_cart_items_user_product', ['userId', 'productId'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Cart item ID', example: 1, required: true })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  @ApiProperty({ description: 'Owner user ID', example: 1, required: true })
  userId: number;

  @Column({ name: 'product_id', type: 'int' })
  @ApiProperty({ description: 'Product ID', example: 12, required: true })
  productId: number;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Requested quantity', example: 2, required: true })
  quantity: number;

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

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;
}
