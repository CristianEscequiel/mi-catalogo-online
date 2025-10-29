import { Column, CreateDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Category } from './category.entity';
import { User } from '../../users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity({
  name: 'posts',
})
export class Post {
  @ApiProperty({ description: 'The ID number of the post' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'text', nullable: true })
  content: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'varchar', length: 900, name: 'cover_image', nullable: true })
  coverImage: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'varchar', length: 255, name: 'summary', nullable: true })
  summary: string;

  @ApiProperty({ description: 'The ID number of the post' })
  @Column({ type: 'boolean', default: true, name: 'is_draft' })
  isDraft: boolean;

  @ApiProperty({ description: 'The ID number of the post' })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  createdAt: Date;

  @ApiProperty({ description: 'The ID number of the post' })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.posts, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Category, (category) => category.posts)
  @JoinTable({
    name: 'posts_categories',
    joinColumn: { name: 'post_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: Category[];
}
