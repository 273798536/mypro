import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './Batch';

export type AuditAction = 
  | 'batch_created'
  | 'batch_updated'
  | 'batch_submitted'
  | 'batch_withdrawn'
  | 'batch_frozen'
  | 'batch_unfrozen'
  | 'batch_completed'
  | 'material_added'
  | 'material_updated'
  | 'material_removed'
  | 'audit_result_added'
  | 'cost_added'
  | 'remark_added'
  | 'manual_override'
  | 'mapping_created'
  | 'exported';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  batchId: string;

  @Column({ nullable: true })
  materialId: string;

  @Column({ type: 'text' })
  action: AuditAction;

  @Column({ type: 'text', nullable: true })
  fieldName: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string;

  @Column({ type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'text', nullable: true })
  diff: string;

  @Column({ nullable: true })
  operator: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Batch, batch => batch.auditLogs, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;
}
