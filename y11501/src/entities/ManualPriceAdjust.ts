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

  @Column({ type: 'varchar', nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  partCode: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adjustedPrice: number | null;

  @Column({ type: 'text', nullable: true })
  adjustReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  approvedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  adjustDate: Date | null;

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

  @ManyToOne(() => ImportBatch, batch => batch.manualPriceAdjusts, { nullable: true, onDelete: 'SET NULL' })
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
