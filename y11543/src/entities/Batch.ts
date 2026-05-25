import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Material } from './Material';

export type BatchStatus = 'draft' | 'submitted' | 'processing' | 'partial_failed' | 'completed' | 'frozen' | 'withdrawn';
export type DuplicateStrategy = 'ignore' | 'overwrite' | 'append';

@Entity()
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'text' })
  batchNo: string;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'text',
    default: 'draft'
  })
  status: BatchStatus;

  @Column({
    type: 'text',
    default: 'ignore'
  })
  duplicateStrategy: DuplicateStrategy;

  @Column({ type: 'text', nullable: true })
  operator: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', default: 0 })
  materialCount: number;

  @Column({ type: 'integer', default: 0 })
  successCount: number;

  @Column({ type: 'integer', default: 0 })
  failedCount: number;

  @Column({ type: 'boolean', default: false })
  frozen: boolean;

  @Column({ type: 'datetime', nullable: true })
  frozenAt: Date | null;

  @Column({ type: 'text', nullable: true })
  frozenBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Material, material => material.batch)
  materials: Material[];
}
