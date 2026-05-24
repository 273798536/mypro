import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Role } from '../../types';

@Entity('users')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index({ unique: true })
  employeeId: string;

  @Column()
  name: string;

  @Column({
    type: 'simple-enum',
    enum: Role
  })
  role: Role;

  @Column()
  department: string;

  @Column({ type: 'json', default: '[]' })
  permissions: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column()
  passwordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
