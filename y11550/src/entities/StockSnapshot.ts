import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';

@Entity('stock_snapshots')
export class StockSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  cabinetId: string;

  @Column()
  slotId: string;

  @Column()
  productId: string;

  @Column()
  productName: string;

  @Column({ default: 0 })
  beforeStock: number;

  @Column({ default: 0 })
  restockAmount: number;

  @Column({ default: 0 })
  afterStock: number;

  @Column({ type: 'int', nullable: true })
  actualStock?: number;

  @Column({ type: 'int', nullable: true })
  stockDiff?: number;

  @Column({ default: false })
  isHotSlot: boolean;

  @Column({ default: false })
  isException: boolean;

  @Column({ type: 'text', nullable: true })
  exceptionReason?: string;

  @Column({ type: 'datetime' })
  snapshotTime: Date;

  @Column({ default: false })
  isDeduplicated: boolean;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Receipt, receipt => receipt.stockSnapshots, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
