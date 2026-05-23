import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Batch } from './Batch';

export type TaskStatus = 'pending' | 'processing' | 'retry_waiting' | 'manual_waiting' | 'failed' | 'completed';
export type TaskType = 'import' | 'match' | 'export' | 'calculate' | 'notify';

@Entity('async_tasks')
export class AsyncTask extends BaseEntity {
  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @ManyToOne(() => Batch, batch => batch.asyncTasks, { nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({
    type: 'simple-enum',
    enum: ['import', 'match', 'export', 'calculate', 'notify'],
    default: 'import'
  })
  taskType: TaskType;

  @Column({
    type: 'simple-enum',
    enum: ['pending', 'processing', 'retry_waiting', 'manual_waiting', 'failed', 'completed'],
    default: 'pending'
  })
  status: TaskStatus;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'next_retry_at', nullable: true, type: 'datetime' })
  nextRetryAt: Date;

  @Column({ name: 'started_at', nullable: true, type: 'datetime' })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true, type: 'datetime' })
  completedAt: Date;

  @Column({ name: 'failed_at', nullable: true, type: 'datetime' })
  failedAt: Date;

  @Column({ name: 'progress', default: 0 })
  progress: number;

  @Column({ name: 'total_items', default: 0 })
  totalItems: number;

  @Column({ name: 'processed_items', default: 0 })
  processedItems: number;

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ name: 'error_stack', nullable: true, type: 'text' })
  errorStack: string;

  @Column({ name: 'error_code', nullable: true })
  errorCode: string;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ name: 'resolution_note', nullable: true, type: 'text' })
  resolutionNote: string;

  @Column({ type: 'simple-json', nullable: true })
  payload: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  result: Record<string, any>;
}
