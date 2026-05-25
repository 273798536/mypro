import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Material } from './Material';
import { AuditLog } from './AuditLog';

export type BatchStatus = 'draft' | 'submitted' | 'processing' | 'partial_failed' | 'completed' | 'frozen' | 'withdrawn';
export type DuplicateStrategy = 'ignore' | 'overwrite' | 'append';

@Entity()
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  batchNo: string;

  @Column()
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

  @Column({ default: 0 })
  materialCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column({ default: false })
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

  @OneToMany(() => AuditLog, log => log.batch)
  auditLogs: AuditLog[];
}
