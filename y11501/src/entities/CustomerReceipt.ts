import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RecordStatus } from '../types';
import { ImportBatch } from './ImportBatch';

@Entity('customer_receipts')
export class CustomerReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  receiptNo: string;

  @Column({ nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ nullable: true })
  customerName: string | null;

  @Column({ type: 'datetime', nullable: true })
  receiptTime: Date | null;

  @Column({ nullable: true })
  photoUrl: string | null;

  @Column({ nullable: true })
  photoHash: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({
    type: 'simple-enum',
    enum: RecordStatus,
    default: RecordStatus.PENDING
  })
  status: RecordStatus;

  @Column({ nullable: true })
  originalRowNumber: number;

  @Column({ type: 'text', nullable: true })
  originalRowData: string;

  @ManyToOne(() => ImportBatch, batch => batch.customerReceipts, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'importBatchId' })
  importBatch: ImportBatch;

  @Column({ nullable: true })
  importBatchId: string;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
