import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity({
  name: 'categories',
})
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 800, nullable: true, name: 'image_url' })
  imageUrl: string;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createAt: Date;

  @CreateDateColumn({
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updateAt: Date;

  @ManyToMany(() => Product, (product) => product.categories)
  products: Product[];
}
