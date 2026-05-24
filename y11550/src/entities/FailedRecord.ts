import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { DataSource } from '../types';

@Entity('failed_records')
export class FailedRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  batchNo?: string;

  @Column({ type: 'simple-enum', enum: DataSource })
  source: DataSource;

  @Column({ type: 'text' })
  errorType: string;

  @Column({ type: 'text' })
  errorMessage: string;

  @Column({ type: 'simple-json' })
  rawData: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  validationErrors?: Record<string, any>[];

  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ type: 'text', nullable: true })
  resolutionNote?: string;

  @Column({ nullable: true })
  importedBy?: string;

  @CreateDateColumn()
  createdAt: Date;
}
