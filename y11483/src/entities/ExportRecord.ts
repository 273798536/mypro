import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
  EXCEL = 'excel',
}

export enum ExportType {
  BATCH_TRACE = 'batch_trace',
  SAMPLE_LABEL = 'sample_label',
  TEMPERATURE = 'temperature',
  COMPLAINT = 'complaint',
  HANDOVER = 'handover',
  FULL_TRACE = 'full_trace',
}

@Entity('export_records')
export class ExportRecord extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  exportNo: string;

  @Column({ type: 'simple-enum', enum: ExportType })
  exportType: ExportType;

  @Column({ type: 'simple-enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ type: 'simple-enum', enum: ExportStatus, default: ExportStatus.PENDING })
  status: ExportStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  batchNo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  potNo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  traceNo: string;

  @Column({ type: 'simple-json', nullable: true })
  filters: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  recordCount: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  filePath: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  fileName: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationMs: number;

  @Column({ type: 'varchar', length: 100 })
  exportedBy: string;
}