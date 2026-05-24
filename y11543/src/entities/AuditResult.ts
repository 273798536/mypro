import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Material } from './Material';

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

@Entity()
export class AuditResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  materialId: string;

  @Column({ type: 'text', default: 'pending' })
  status: AuditStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  auditor: string;

  @Column({ type: 'boolean', default: false })
  isManual: boolean;

  @Column({ type: 'text', nullable: true })
  previousStatus: string;

  @Column({ nullable: true })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Material, material => material.auditResults, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialRecordId' })
  material: Material;

  @Column()
  materialRecordId: string;
}
