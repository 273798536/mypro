import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { RetryCategory, PayloadType } from './RetryQueue';

export enum DeadLetterReason {
  MAX_RETRY_EXCEEDED = 'max_retry_exceeded',
  MANUAL_MOVE = 'manual_move',
  FATAL_ERROR = 'fatal_error',
  BUSINESS_REJECTED = 'business_rejected'
}

export enum DeadLetterStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  DISCARDED = 'discarded',
  REQUEUED = 'requeued'
}

@Entity()
export class DeadLetter extends BaseEntity {
  @Column({ unique: true })
  deadLetterId!: string;

  @Column()
  originalTaskId!: string;

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
    enum: DeadLetterReason
  })
  reason!: DeadLetterReason;

  @Column({
    type: 'simple-enum',
    enum: RetryCategory,
    nullable: true
  })
  retryCategory?: RetryCategory;

  @Column({
    type: 'simple-enum',
    enum: DeadLetterStatus,
    default: DeadLetterStatus.OPEN
  })
  status!: DeadLetterStatus;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'simple-json', nullable: true })
  errorDetails?: any;

  @Column({ type: 'int' })
  retryCount!: number;

  @Column({ type: 'text', nullable: true })
  resolvedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  resolutionNote?: string;

  @Column({ type: 'text', nullable: true })
  requeuedTaskId?: string;

  @Column({ type: 'simple-json', nullable: true })
  tags?: string[];
}
