import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';

@Entity({ name: 'orders' })
@Index('IDX_orders_user', ['userId'])
export class Order {
  @PrimaryGeneratedColumn()
  @ApiProperty({ description: 'Order ID', example: 1, required: true })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  @ApiProperty({ description: 'Owner user ID', example: 1, required: true })
  userId: number;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  @ApiProperty({ description: 'Customer name', example: 'Ana Gomez', required: true })
  customerName: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 255 })
  @ApiProperty({ description: 'Customer email', example: 'ana.gomez@example.com', required: true })
  customerEmail: string;

  @Column({ name: 'shipping_address', type: 'text' })
  @ApiProperty({ description: 'Shipping address', example: 'Av. Siempre Viva 742', required: true })
  shippingAddress: string;

  @Column({ type: 'float', default: 0 })
  @ApiProperty({ description: 'Order total amount', example: 240, required: true })
  total: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING_PAYMENT,
  })
  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PENDING_PAYMENT,
    required: true,
  })
  status: OrderStatus;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items: OrderItem[];

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;
}
