import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

@Entity('failed_records')
export class FailedRecord extends BaseEntity {
  @Column({ name: 'record_type' })
  recordType: string;

  @Column({ type: 'simple-json' })
  rawData: Record<string, any>;

  @Column({ type: 'text' })
  errorMessage: string;

  @Column({ type: 'simple-json', nullable: true })
  errorDetails?: Record<string, any>;

  @Column({ name: 'source_system', nullable: true })
  sourceSystem?: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId?: string;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number = 0;

  @Column({ name: 'last_retry_at', nullable: true })
  lastRetryAt?: Date;

  @Column({ name: 'is_resolved', default: false })
  isResolved: boolean = false;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;
}
