import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';

@Entity('repair_orders')
export class RepairOrder extends BaseEntity {
  @Column({ name: 'order_no', unique: true })
  orderNo: string;

  @Column({ name: 'customer_name', nullable: true })
  customerName?: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone?: string;

  @Column({ name: 'customer_address', nullable: true, type: 'text' })
  customerAddress?: string;

  @Column({ name: 'product_model', nullable: true })
  productModel?: string;

  @Column({ name: 'product_sn', nullable: true })
  productSn?: string;

  @Column({ name: 'fault_description', nullable: true, type: 'text' })
  faultDescription?: string;

  @Column({ name: 'engineer_id', nullable: true })
  engineerId?: string;

  @Column({ name: 'engineer_name', nullable: true })
  engineerName?: string;

  @Column({ name: 'repair_date', nullable: true })
  repairDate?: Date;

  @Column({ name: 'is_after_supplement', default: false })
  isAfterSupplement: boolean = false;

  @Column({ name: 'supplement_reason', nullable: true, type: 'text' })
  supplementReason?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @OneToMany(() => Ledger, (ledger) => ledger.repairOrder)
  ledgers: Ledger[];
}
