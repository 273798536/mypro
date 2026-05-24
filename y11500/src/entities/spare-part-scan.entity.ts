import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { PartType } from '../common/enums/part-type.enum';

@Entity('spare_part_scans')
export class SparePartScan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scanNo: string;

  @Column()
  partCode: string;

  @Column()
  partName: string;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({
    type: 'simple-enum',
    enum: PartType,
    default: PartType.NORMAL,
  })
  partType: PartType;

  @Column({ type: 'datetime', nullable: true })
  scanTime: Date;

  @Column({ nullable: true })
  operator: string;

  @Column({ type: 'text', nullable: true })
  rawContent: string;

  @Column({ default: false })
  isDirty: boolean;

  @ManyToOne(() => Batch, batch => batch.sparePartScans, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column({ nullable: true })
  batchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
