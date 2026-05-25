import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../types';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'simple-enum',
    enum: UserRole,
    default: UserRole.READONLY
  })
  role: UserRole;

  @Column({ type: 'varchar', nullable: true })
  fullName: string | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
