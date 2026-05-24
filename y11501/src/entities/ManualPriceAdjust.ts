import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RecordStatus } from '../types';
import { ImportBatch } from './ImportBatch';

@Entity('manual_price_adjusts')
export class ManualPriceAdjust {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  adjustNo: string;

  @Column({ nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ nullable: true })
  partCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adjustedPrice: number | null;

  @Column({ type: 'text', nullable: true })
  adjustReason: string | null;

  @Column({ nullable: true })
  approvedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  adjustDate: Date | null;

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

  @ManyToOne(() => ImportBatch, batch => batch.manualPriceAdjusts, { nullable: true, onDelete: 'SET NULL' })
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
