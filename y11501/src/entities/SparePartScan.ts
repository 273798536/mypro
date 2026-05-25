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

  @Column({ type: 'varchar', nullable: true })
  @Index()
  repairOrderNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  partCode: string | null;

  @Column({ type: 'varchar', nullable: true })
  partName: string | null;

  @Column({ type: 'int', nullable: true })
  quantity: number | null;

  @Column({
    type: 'simple-enum',
    enum: PartActionType,
    nullable: true
  })
  actionType: PartActionType | null;

  @Column({ type: 'varchar', nullable: true })
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

  @Column({ type: 'int', nullable: true })
  originalRowNumber: number | null;

  @Column({ type: 'text', nullable: true })
  originalRowData: string | null;

  @ManyToOne(() => ImportBatch, batch => batch.sparePartScans, { nullable: true, onDelete: 'SET NULL' })
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
