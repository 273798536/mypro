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

  @Column({ type: 'varchar', nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'datetime', nullable: true })
  receiptTime: Date | null;

  @Column({ type: 'varchar', nullable: true })
  photoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  photoHash: string | null;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @Column({
    type: 'simple-enum',
    enum: RecordStatus,
    default: RecordStatus.PENDING
  })
  status: RecordStatus;

  @Column({ type: 'int', nullable: true })
  originalRowNumber: number | null;

  @Column({ type: 'text', nullable: true })
  originalRowData: string | null;

  @ManyToOne(() => ImportBatch, batch => batch.customerReceipts, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'importBatchId' })
  importBatch: ImportBatch;

  @Column({ type: 'varchar', nullable: true })
  importBatchId: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
