import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './category.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '../models/status.enum';

@Entity({
  name: 'products',
})
export class Product {
  @ApiProperty({ description: 'The ID number of the product' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: '' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: '' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  slug: string;

  @ApiProperty({ description: '' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  sku: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'float', nullable: true })
  price: number;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'enum', enum: Status, default: Status.DRAFT })
  status: Status;

  @ApiProperty({ description: '' })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @ApiProperty({ description: '' })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.products, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Category, (category) => category.products)
  @JoinTable({
    name: 'product_categories',
    joinColumn: { name: 'product_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];
}
