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

  @Column({ type: 'text', nullable: true })
  batchId: string | null;

  @Column({ type: 'text', nullable: true })
  materialId: string | null;

  @Column({ type: 'text' })
  action: AuditAction;

  @Column({ type: 'text', nullable: true })
  fieldName: string | null;

  @Column({ type: 'text', nullable: true })
  oldValue: string | null;

  @Column({ type: 'text', nullable: true })
  newValue: string | null;

  @Column({ type: 'text', nullable: true })
  diff: string | null;

  @Column({ type: 'text', nullable: true })
  operator: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Batch, batch => batch.auditLogs, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'batchId' })
  batch: Batch;
}
