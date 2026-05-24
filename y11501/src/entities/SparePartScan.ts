import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RecordStatus } from '../types';
import { ImportBatch } from './ImportBatch';

export enum PartActionType {
  PICKUP = 'pickup',
  RETURN = 'return',
  SCRAP = 'scrap'
}

@Entity('spare_part_scans')
export class SparePartScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  scanNo: string;

  @Column({ nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ nullable: true })
  partCode: string | null;

  @Column({ nullable: true })
  partName: string | null;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({
    type: 'simple-enum',
    enum: PartActionType,
    nullable: true
  })
  actionType: PartActionType | null;

  @Column({ nullable: true })
  engineerName: string | null;

  @Column({ type: 'datetime', nullable: true })
  scanTime: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number | null;

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

  @ManyToOne(() => ImportBatch, batch => batch.sparePartScans, { nullable: true, onDelete: 'SET NULL' })
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
