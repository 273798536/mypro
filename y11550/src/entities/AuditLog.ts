import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { AuditAction, ReceiptStatus } from '../types';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column({ type: 'simple-enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'simple-enum', enum: ReceiptStatus, nullable: true })
  oldStatus?: ReceiptStatus;

  @Column({ type: 'simple-enum', enum: ReceiptStatus, nullable: true })
  newStatus?: ReceiptStatus;

  @Column()
  operatorId: string;

  @Column()
  operatorName: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'simple-json', nullable: true })
  changes?: Record<string, { old: any; new: any }>;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => Receipt, receipt => receipt.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
