import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { RecordStatus } from '../types';
import { ImportBatch } from './ImportBatch';

export enum ShiftType {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
  OVERTIME = 'overtime'
}

@Entity('shift_records')
export class ShiftRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  shiftNo: string;

  @Column({ type: 'varchar', nullable: true })
  engineerName: string | null;

  @Column({
    type: 'simple-enum',
    enum: ShiftType,
    nullable: true
  })
  shiftType: ShiftType | null;

  @Column({ type: 'date', nullable: true })
  shiftDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkInTime: Date | null;

  @Column({ type: 'datetime', nullable: true })
  checkOutTime: Date | null;

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

  @ManyToOne(() => ImportBatch, batch => batch.shiftRecords, { nullable: true, onDelete: 'SET NULL' })
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
