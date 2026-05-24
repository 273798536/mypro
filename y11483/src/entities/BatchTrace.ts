import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum TraceStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL_FAILED = 'partial_failed',
  FAILED = 'failed',
  FROZEN = 'frozen',
  CANCELLED = 'cancelled',
}

export enum ConflictStrategy {
  IGNORE = 'ignore',
  OVERWRITE = 'overwrite',
  APPEND = 'append',
  ERROR = 'error',
}

export enum DataSource {
  SAMPLE_LABEL = 'sample_label',
  TEMPERATURE = 'temperature',
  COMPLAINT = 'complaint',
  HANDOVER = 'handover',
  MANUAL = 'manual',
}

export interface TraceStore {
  storeCode: string;
  storeName: string;
  handoverNo: string;
  deliveredQuantity: number;
  receivedQuantity: number;
  status: string;
}

@Entity('batch_traces')
export class BatchTrace extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  traceNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  batchNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  potNo: string;

  @Column({ type: 'varchar', length: 100 })
  productName: string;

  @Column({ type: 'datetime' })
  productionTime: Date;

  @Column({ type: 'simple-enum', enum: TraceStatus, default: TraceStatus.CREATED })
  status: TraceStatus;

  @Column({ type: 'simple-enum', enum: ConflictStrategy, default: ConflictStrategy.ERROR })
  conflictStrategy: ConflictStrategy;

  @Column({ type: 'simple-json', nullable: true })
  stores: TraceStore[];

  @Column({ type: 'int', default: 0 })
  totalStores: number;

  @Column({ type: 'int', default: 0 })
  completedStores: number;

  @Column({ type: 'int', default: 0 })
  sampleLabelCount: number;

  @Column({ type: 'int', default: 0 })
  temperatureRecordCount: number;

  @Column({ type: 'int', default: 0 })
  complaintCount: number;

  @Column({ type: 'int', default: 0 })
  handoverCount: number;

  @Column({ type: 'boolean', default: false })
  hasAbnormalTemperature: boolean;

  @Column({ type: 'boolean', default: false })
  hasComplaint: boolean;

  @Column({ type: 'text', nullable: true })
  summary: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'simple-json', nullable: true })
  failedItems: string[];

  @Column({ type: 'simple-json', nullable: true })
  dataSources: DataSource[];

  @Column({ type: 'datetime', nullable: true })
  frozenAt: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  frozenBy: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;
}