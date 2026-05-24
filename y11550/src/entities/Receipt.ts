import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ReceiptStatus } from '../types';
import { StockSnapshot } from './StockSnapshot';
import { RestockPhoto } from './RestockPhoto';
import { RefundRecord } from './RefundRecord';
import { SupplierBillItem } from './SupplierBillItem';
import { ExceptionRecord } from './ExceptionRecord';
import { AuditLog } from './AuditLog';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  batchNo: string;

  @Column()
  cabinetId: string;

  @Column()
  cabinetName: string;

  @Column()
  city: string;

  @Column({
    type: 'simple-enum',
    enum: ReceiptStatus,
    default: ReceiptStatus.DRAFT
  })
  status: ReceiptStatus;

  @Column({ nullable: true })
  previousStatus?: ReceiptStatus;

  @Column({ type: 'datetime', nullable: true })
  statusChangedAt?: Date;

  @Column({ nullable: true })
  statusChangedBy?: string;

  @Column({ nullable: true })
  statusChangeReason?: string;

  @Column({ default: false })
  isFrozen: boolean;

  @Column({ type: 'datetime', nullable: true })
  frozenAt?: Date;

  @Column({ nullable: true })
  frozenBy?: string;

  @Column({ nullable: true })
  freezeReason?: string;

  @Column({ type: 'text', nullable: true })
  manualReason?: string;

  @Column({ default: 0 })
  totalStockBefore: number;

  @Column({ default: 0 })
  totalRestockAmount: number;

  @Column({ default: 0 })
  totalStockAfter: number;

  @Column({ default: 0 })
  totalRefundAmount: number;

  @Column({ default: 0 })
  exceptionCount: number;

  @Column({ default: false })
  hasUnresolvedExceptions: boolean;

  @Column()
  createdBy: string;

  @Column()
  createdByName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  settledAt?: Date;

  @Column({ nullable: true })
  settledBy?: string;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date;

  @Column({ nullable: true })
  archivedBy?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => StockSnapshot, snapshot => snapshot.receipt, { cascade: true })
  stockSnapshots: StockSnapshot[];

  @OneToMany(() => RestockPhoto, photo => photo.receipt, { cascade: true })
  restockPhotos: RestockPhoto[];

  @OneToMany(() => RefundRecord, refund => refund.receipt, { cascade: true })
  refundRecords: RefundRecord[];

  @OneToMany(() => SupplierBillItem, bill => bill.receipt, { cascade: true })
  supplierBillItems: SupplierBillItem[];

  @OneToMany(() => ExceptionRecord, exception => exception.receipt, { cascade: true })
  exceptions: ExceptionRecord[];

  @OneToMany(() => AuditLog, log => log.receipt, { cascade: true })
  auditLogs: AuditLog[];
}
