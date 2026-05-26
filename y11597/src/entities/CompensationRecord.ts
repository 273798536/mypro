import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { CompensationStatus, DataSource, RetryCategory } from '../types/enums';
import { StatusHistory } from './StatusHistory';

@Entity('compensation_records')
export class CompensationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  businessKey!: string;

  @Column({ type: 'varchar' })
  dataSource!: DataSource | string;

  @Column({ type: 'text', nullable: true })
  sourceId?: string;

  @Column()
  customerId!: string;

  @Column({ type: 'text', nullable: true })
  customerName?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  compensationAmount!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({
    type: 'simple-enum',
    enum: CompensationStatus,
    default: CompensationStatus.SUBMITTED
  })
  status!: CompensationStatus;

  @Column({ default: 0 })
  retryCount!: number;

  @Column({ default: 3 })
  maxRetryCount!: number;

  @Column({
    type: 'simple-enum',
    enum: RetryCategory,
    nullable: true
  })
  retryCategory?: RetryCategory;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'datetime', nullable: true })
  nextRetryAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  lastRetriedAt?: Date;

  @Column({ type: 'text', nullable: true })
  submittedBy?: string;

  @Column({ type: 'text', nullable: true })
  handledBy?: string;

  @Column({ type: 'text', nullable: true })
  reviewedBy?: string;

  @Column({ type: 'text', nullable: true })
  approvedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  compensatedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  approvedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  closedAt?: Date;

  @Column({ type: 'text', nullable: true })
  externalReceiptId?: string;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ default: false })
  isBadData!: boolean;

  @Column({ type: 'text', nullable: true })
  badDataReason?: string;

  @OneToMany(() => StatusHistory, history => history.compensationRecord)
  statusHistories!: StatusHistory[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
