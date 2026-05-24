import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';
import { ImportSource, Role } from '../types';

@Entity('import_failures')
export class ImportFailureEntity {
  @PrimaryColumn()
  id: string;

  @Column({
    type: 'text'
  })
  source: ImportSource;

  @Column()
  rowNumber: number;

  @Column('text')
  rawData: string;

  @Column('text')
  errorMessage: string;

  @CreateDateColumn()
  importedAt: Date;

  @Column()
  importedBy: string;
}

@Entity('users')
export class UserEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({
    type: 'text'
  })
  role: Role;

  @Column()
  department: string;

  @CreateDateColumn()
  createdAt: Date;
}