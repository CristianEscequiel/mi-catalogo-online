import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity({
  name: 'profiles',
})
export class Profile {
  @PrimaryGeneratedColumn()
  @ApiProperty({
    description: 'Profile ID',
    example: 1,
    required: true,
  })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  @ApiProperty({
    description: 'First name',
    example: 'Ana',
    required: true,
  })
  name: string;

  @Column({ type: 'varchar', length: 255, name: 'last_name' })
  @ApiProperty({
    description: 'Last name',
    example: 'Gomez',
    required: true,
  })
  lastName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://example.com/avatars/ana.png',
  })
  avatar: string | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'created_at',
  })
  @ApiProperty({
    description: 'Created at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'updated_at',
  })
  @ApiProperty({
    description: 'Updated at timestamp',
    example: '2026-03-06T12:00:00.000Z',
    required: true,
  })
  updatedAt: Date;
}
