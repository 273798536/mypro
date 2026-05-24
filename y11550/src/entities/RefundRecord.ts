import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { DataSource } from '../types';

@Entity('refund_records')
export class RefundRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  refundNo: string;

  @Column()
  cabinetId: string;

  @Column({ nullable: true })
  orderNo?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  refundAmount: number;

  @Column({ nullable: true })
  productId?: string;

  @Column({ nullable: true })
  productName?: string;

  @Column({ type: 'int', nullable: true })
  refundQuantity?: number;

  @Column({ nullable: true })
  refundReason?: string;

  @Column({ type: 'simple-enum', enum: DataSource, default: DataSource.REFUND_RECORD })
  source: DataSource;

  @Column({ type: 'datetime' })
  refundTime: Date;

  @Column({ default: false })
  isAbnormal: boolean;

  @Column({ type: 'text', nullable: true })
  abnormalReason?: string;

  @Column({ default: false })
  isDeduplicated: boolean;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: Record<string, any>;

  @Column({ nullable: true })
  importedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Receipt, receipt => receipt.refundRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
