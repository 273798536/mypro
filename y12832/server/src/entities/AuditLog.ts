import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type AuditAction = 
  | 'sample_import' 
  | 'sample_update' 
  | 'status_change' 
  | 'review_submit' 
  | 'timepoint_fix' 
  | 'duplicate_handle'
  | 'record_create'
  | 'record_update'
  | 'report_export';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  sampleId: number;

  @Column()
  action: AuditAction;

  @Column({ type: 'text', nullable: true })
  fieldName: string;

  @Column({ type: 'text', nullable: true })
  oldValue: string;

  @Column({ type: 'text', nullable: true })
  newValue: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column()
  operator: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  extraInfo: string;
}
