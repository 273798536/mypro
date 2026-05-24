import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { BorrowApplication } from './BorrowApplication';

export enum ExpressStatus {
  PENDING = 'pending',
  CREATED = 'created',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned'
}

export enum ExpressType {
  FORWARD = 'forward',
  RETURN = 'return'
}

@Entity()
export class ExpressOrder extends BaseEntity {
  @Column({ unique: true })
  expressNo!: string;

  @Column()
  applicationId!: string;

  @ManyToOne(() => BorrowApplication, application => application.expressOrders)
  @JoinColumn({ name: 'applicationId' })
  application!: BorrowApplication;

  @Column({
    type: 'simple-enum',
    enum: ExpressType,
    default: ExpressType.FORWARD
  })
  expressType!: ExpressType;

  @Column({
    type: 'simple-enum',
    enum: ExpressStatus,
    default: ExpressStatus.PENDING
  })
  status!: ExpressStatus;

  @Column()
  courierCompany!: string;

  @Column({ nullable: true })
  sender?: string;

  @Column({ nullable: true })
  senderPhone?: string;

  @Column({ nullable: true })
  senderAddress?: string;

  @Column()
  receiver!: string;

  @Column()
  receiverPhone!: string;

  @Column()
  receiverAddress!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fee!: number;

  @Column({ type: 'datetime', nullable: true })
  shipTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  deliverTime?: Date;

  @Column({ type: 'text', nullable: true })
  trackingInfo?: string;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: any;

  @Column({ type: 'text', nullable: true })
  externalReference?: string;
}
