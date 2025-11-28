import { BeforeInsert, Column, CreateDateColumn, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { Profile } from './profile.entity';
import { Product } from '../../product/entities/product.entity';
import { Role } from '../../auth/roles/roles.enum';

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Exclude()
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'enum', enum: Role, default: Role.CLIENT })
  role: Role;

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
  @OneToOne(() => Profile, { nullable: false, cascade: true })
  @JoinColumn({ name: 'profile_id' })
  profile: Profile;

  @OneToMany(() => Product, (product) => product.user)
  products: Product[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}
