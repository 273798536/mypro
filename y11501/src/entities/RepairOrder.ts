import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RecordStatus } from '../types';
import { ImportBatch } from './ImportBatch';

@Entity('repair_orders')
export class RepairOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  orderNo: string;

  @Column({ nullable: true })
  engineerName: string | null;

  @Column({ nullable: true })
  engineerId: string | null;

  @Column({ type: 'datetime', nullable: true })
  orderDate: Date | null;

  @Column({ nullable: true })
  customerName: string | null;

  @Column({ nullable: true })
  customerPhone: string | null;

  @Column({ type: 'text', nullable: true })
  faultDescription: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalAmount: number | null;

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

  @ManyToOne(() => ImportBatch, batch => batch.repairOrders, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'importBatchId' })
  importBatch: ImportBatch;

  @Column({ nullable: true })
  importBatchId: string;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
