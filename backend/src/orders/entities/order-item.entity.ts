import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from '../../product/entities/product.entity';
import { Order } from './order.entity';

@Entity({ name: 'order_items' })
@Index('IDX_order_items_order', ['orderId'])
@Index('IDX_order_items_product', ['productId'])
export class OrderItem {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Order item ID', example: 1, required: true })
  id: number;

  @Column({ name: 'order_id', type: 'int' })
  @ApiProperty({ description: 'Order ID', example: 1, required: true })
  orderId: number;

  @Column({ name: 'product_id', type: 'int' })
  @ApiProperty({ description: 'Product ID', example: 10, required: true })
  productId: number;

  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  @ApiProperty({ description: 'Product name snapshot', example: 'Teclado mecánico', required: true })
  productName: string;

  @Column({ type: 'int' })
  @ApiProperty({ description: 'Ordered quantity', example: 2, required: true })
  quantity: number;

  @Column({ name: 'unit_price', type: 'float' })
  @ApiProperty({ description: 'Unit price snapshot', example: 120, required: true })
  unitPrice: number;

  @Column({ type: 'float' })
  @ApiProperty({ description: 'Line subtotal', example: 240, required: true })
  subtotal: number;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Product, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
