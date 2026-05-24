import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum HandoverStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  RECEIVED = 'received',
  RETURNED = 'returned',
  PARTIAL_RETURNED = 'partial_returned',
}

@Entity('store_handovers')
export class StoreHandover extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 50 })
  handoverNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  batchNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  potNo: string;

  @Column({ type: 'varchar', length: 100 })
  storeName: string;

  @Column({ type: 'varchar', length: 50 })
  storeCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  productName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  deliveredQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  receivedQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  returnedQuantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'datetime' })
  deliveryTime: Date;

  @Column({ type: 'datetime', nullable: true })
  receivedTime: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deliveryPerson: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  receiver: string;

  @Column({
    type: 'simple-enum',
    enum: HandoverStatus,
    default: HandoverStatus.PENDING,
  })
  status: HandoverStatus;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehicleNo: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureOnArrival: number;
}