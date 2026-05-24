import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum EntityType {
  SAMPLE_LABEL = 'sample_label',
  TEMPERATURE_RECORD = 'temperature_record',
  STORE_COMPLAINT = 'store_complaint',
  STORE_HANDOVER = 'store_handover',
  BATCH_TRACE = 'batch_trace',
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SUBMIT = 'submit',
  WITHDRAW = 'withdraw',
  VERIFY = 'verify',
  REJECT = 'reject',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  MANUAL_JUDGE = 'manual_judge',
  EXPORT = 'export',
  IMPORT = 'import',
  REPLAY = 'replay',
}

@Entity('status_audit_logs')
export class StatusAuditLog extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 50 })
  entityId: string;

  @Index()
  @Column({ type: 'simple-enum', enum: EntityType })
  entityType: EntityType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityNo: string;

  @Index()
  @Column({ type: 'simple-enum', enum: OperationType })
  operationType: OperationType;

  @Column({ type: 'varchar', length: 100 })
  operator: string;

  @Column({ type: 'datetime' })
  operationTime: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  oldStatus: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  newStatus: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'simple-json', nullable: true })
  oldData: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  newData: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  changedFields: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId: string;
}