import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { DataSource } from '../types';

@Entity('approval_emails')
export class ApprovalEmail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  receiptId?: string;

  @Column()
  emailId: string;

  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column()
  fromAddress: string;

  @Column({ type: 'simple-array', nullable: true })
  toAddresses?: string[];

  @Column({ type: 'simple-array', nullable: true })
  ccAddresses?: string[];

  @Column({ nullable: true })
  approverName?: string;

  @Column({ nullable: true })
  approverEmail?: string;

  @Column({ nullable: true })
  approvalDecision?: string;

  @Column({ type: 'text', nullable: true })
  approvalNote?: string;

  @Column({ type: 'datetime' })
  emailTime: Date;

  @Column({ type: 'simple-enum', enum: DataSource, default: DataSource.APPROVAL_EMAIL })
  source: DataSource;

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ type: 'datetime', nullable: true })
  processedAt?: Date;

  @Column({ nullable: true })
  processedBy?: string;

  @Column({ default: false })
  isException: boolean;

  @Column({ type: 'text', nullable: true })
  exceptionReason?: string;

  @Column({ type: 'simple-json', nullable: true })
  attachments?: Array<{
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;

  @Column({ type: 'simple-json' })
  rawData: Record<string, any>;

  @Column({ nullable: true })
  importedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Receipt, receipt => receipt.approvalEmails, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'receiptId' })
  receipt?: Receipt;
}
