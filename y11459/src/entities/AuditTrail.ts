import { Entity, Column } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export type ActionType = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'submit' 
  | 'reject' 
  | 'confirm' 
  | 'audit' 
  | 'export' 
  | 'import' 
  | 'match' 
  | 'status_change';

export type EntityType = 
  | 'batch' 
  | 'leader_refund' 
  | 'warehouse_review' 
  | 'remark' 
  | 'exception_photo' 
  | 'async_task';

@Entity('audit_trails')
export class AuditTrail extends BaseEntity {
  @Column({
    type: 'simple-enum',
    enum: ['create', 'update', 'delete', 'submit', 'reject', 'confirm', 'audit', 'export', 'import', 'match', 'status_change']
  })
  action: ActionType;

  @Column({
    type: 'simple-enum',
    enum: ['batch', 'leader_refund', 'warehouse_review', 'remark', 'exception_photo', 'async_task']
  })
  entityType: EntityType;

  @Column({ name: 'entity_id' })
  entityId: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @Column({ name: 'operator_id', nullable: true })
  operatorId: string;

  @Column({ name: 'operator_name', nullable: true })
  operatorName: string;

  @Column({ name: 'operator_role', nullable: true })
  operatorRole: string;

  @Column({ name: 'field_name', nullable: true })
  fieldName: string;

  @Column({ name: 'old_value', nullable: true, type: 'text' })
  oldValue: string;

  @Column({ name: 'new_value', nullable: true, type: 'text' })
  newValue: string;

  @Column({ name: 'change_reason', nullable: true, type: 'text' })
  changeReason: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string;
}
