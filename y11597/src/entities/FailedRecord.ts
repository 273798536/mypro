import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { RetryCategory, DataSource } from '../types/enums';

@Entity('failed_records')
export class FailedRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  recordId!: string;

  @Column()
  businessKey!: string;

  @Column({ type: 'varchar' })
  dataSource!: DataSource | string;

  @Column({
    type: 'simple-enum',
    enum: RetryCategory,
    nullable: true
  })
  retryCategory?: RetryCategory;

  @Column({ type: 'text' })
  errorMessage!: string;

  @Column({ type: 'simple-json', nullable: true })
  errorDetails?: Record<string, any>;

  @Column()
  failedAt!: Date;

  @Column({ default: false })
  isResolved!: boolean;

  @Column({ type: 'text', nullable: true })
  resolvedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  resolutionRemark?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
