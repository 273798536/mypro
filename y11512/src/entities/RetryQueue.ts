import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum QueueStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  MANUAL = 'manual',
  CANCELLED = 'cancelled'
}

export enum RetryCategory {
  NETWORK_ERROR = 'network_error',
  EXTERNAL_API_ERROR = 'external_api_error',
  DATA_VALIDATION_ERROR = 'data_validation_error',
  BUSINESS_RULE_ERROR = 'business_rule_error',
  SYSTEM_ERROR = 'system_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum PayloadType {
  BORROW_APPLICATION = 'borrow_application',
  EXPRESS_ORDER = 'express_order',
  COMPENSATION_RECORD = 'compensation_record',
  FEE_CALCULATION = 'fee_calculation',
  EXTERNAL_RECEIPT = 'external_receipt'
}

@Entity()
export class RetryQueue extends BaseEntity {
  @Column({ unique: true })
  taskId!: string;

  @Column()
  applicationId!: string;

  @Column({
    type: 'simple-enum',
    enum: PayloadType
  })
  payloadType!: PayloadType;

  @Column({ type: 'simple-json' })
  payload!: any;

  @Column({
    type: 'simple-enum',
    enum: QueueStatus,
    default: QueueStatus.PENDING
  })
  status!: QueueStatus;

  @Column({
    type: 'simple-enum',
    enum: RetryCategory,
    nullable: true
  })
  retryCategory?: RetryCategory;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  @Column({ type: 'int', default: 3 })
  maxRetryCount!: number;

  @Column({ type: 'datetime', nullable: true })
  nextRetryTime?: Date;

  @Column({ type: 'int', default: 60 })
  retryIntervalSeconds!: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'simple-json', nullable: true })
  errorDetails?: any;

  @Column({ type: 'datetime', nullable: true })
  lastProcessedAt?: Date;

  @Column({ type: 'text', nullable: true })
  batchId?: string;

  @Column({ type: 'text', nullable: true })
  externalReference?: string;

  @Column({ type: 'boolean', default: false })
  isFrozen!: boolean;

  @Column({ type: 'text', nullable: true })
  frozenBy?: string;

  @Column({ type: 'datetime', nullable: true })
  frozenAt?: Date;

  @Column({ type: 'text', nullable: true })
  frozenReason?: string;

  @Column({ type: 'text', nullable: true })
  handler?: string;

  @Column({ type: 'text', nullable: true })
  manualOperator?: string;

  @Column({ type: 'datetime', nullable: true })
  manualOperatedAt?: Date;

  @Column({ type: 'text', nullable: true })
  manualNote?: string;
}
