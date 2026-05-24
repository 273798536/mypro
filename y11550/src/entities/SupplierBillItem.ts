import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { DataSource } from '../types';

@Entity('supplier_bill_items')
export class SupplierBillItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  billNo: string;

  @Column()
  supplierId: string;

  @Column()
  supplierName: string;

  @Column()
  cabinetId: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column({ type: 'int' })
  billQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: 'int', nullable: true })
  actualQuantity?: number;

  @Column({ type: 'int', nullable: true })
  quantityDiff?: number;

  @Column({ type: 'simple-enum', enum: DataSource, default: DataSource.SUPPLIER_BILL })
  source: DataSource;

  @Column({ default: false })
  isReconciled: boolean;

  @Column({ default: false })
  isException: boolean;

  @Column({ type: 'text', nullable: true })
  exceptionReason?: string;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: Record<string, any>;

  @Column({ nullable: true })
  importedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Receipt, receipt => receipt.supplierBillItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
