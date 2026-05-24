import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  SUBMIT = 'submit',
  WITHDRAW = 'withdraw',
  RETRY = 'retry',
  MANUAL_DECISION = 'manual_decision',
  FREEZE = 'freeze',
  UNFREEZE = 'unfreeze',
  CLOSE = 'close',
  COMPENSATE = 'compensate',
  EXPORT = 'export',
  IMPORT = 'import',
  STATUS_CHANGE = 'status_change',
  FEE_ADJUST = 'fee_adjust'
}

export enum EntityType {
  BORROW_APPLICATION = 'borrow_application',
  EXPRESS_ORDER = 'express_order',
  COMPENSATION_RECORD = 'compensation_record',
  SUPERVISOR_COMMENT = 'supervisor_comment',
  RETRY_QUEUE = 'retry_queue',
  DEAD_LETTER = 'dead_letter'
}

@Entity()
export class OperationLog extends BaseEntity {
  @Column()
  operationType!: OperationType;

  @Column()
  entityType!: EntityType;

  @Column()
  entityId!: string;

  @Column({ nullable: true })
  entityNo?: string;

  @Column({ type: 'simple-json', nullable: true })
  beforeData?: any;

  @Column({ type: 'simple-json', nullable: true })
  afterData?: any;

  @Column({ type: 'simple-json', nullable: true })
  changes?: any;

  @Column({ nullable: true })
  operatorId?: string;

  @Column({ nullable: true })
  operatorName?: string;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  @Column({ type: 'text', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ type: 'text', nullable: true })
  batchId?: string;

  @Column({ type: 'simple-json', nullable: true })
  requestContext?: any;
}
