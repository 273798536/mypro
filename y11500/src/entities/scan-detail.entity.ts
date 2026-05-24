import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { PartType } from '../common/enums/part-type.enum';

@Entity('scan_details')
export class ScanDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  detailNo: string;

  @Column()
  barcode: string;

  @Column({ nullable: true })
  partCode: string;

  @Column({ nullable: true })
  partName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
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
  source: string;

  @Column({ type: 'text', nullable: true })
  rawContent: string;

  @Column({ default: false })
  isDirty: boolean;

  @ManyToOne(() => Batch, batch => batch.scanDetails, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column({ nullable: true })
  batchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
