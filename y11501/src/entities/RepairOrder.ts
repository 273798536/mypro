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

  @Column({ type: 'varchar', nullable: true })
  engineerName: string | null;

  @Column({ type: 'varchar', nullable: true })
  engineerId: string | null;

  @Column({ type: 'datetime', nullable: true })
  orderDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', nullable: true })
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

  @Column({ type: 'int', nullable: true })
  originalRowNumber: number | null;

  @Column({ type: 'text', nullable: true })
  originalRowData: string | null;

  @ManyToOne(() => ImportBatch, batch => batch.repairOrders, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'importBatchId' })
  importBatch: ImportBatch;

  @Column({ type: 'varchar', nullable: true })
  importBatchId: string | null;

  @Column({ type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
