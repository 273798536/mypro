import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

@Entity()
export class AuditResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  materialId: string;

  @Column({ type: 'text', default: 'pending' })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  auditor: string | null;

  @Column({ type: 'boolean', default: false })
  isManual: boolean;

  @Column({ type: 'text', nullable: true })
  previousStatus: string | null;

  @Column({ type: 'integer', nullable: true })
  version: number | null;

  @Column({ type: 'text' })
  materialRecordId: string;

  @CreateDateColumn()
  createdAt: Date;
}
