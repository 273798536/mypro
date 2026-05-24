import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { ExpressOrder } from './ExpressOrder';
import { CompensationRecord } from './CompensationRecord';
import { SupervisorComment } from './SupervisorComment';

export enum BorrowStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  RETURNED = 'returned',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  WITHDRAWN = 'withdrawn',
  FAILED = 'failed'
}

export enum BorrowType {
  INTER_LIBRARY = 'inter_library',
  DOCUMENT_DELIVERY = 'document_delivery'
}

@Entity()
export class BorrowApplication extends BaseEntity {
  @Column({ unique: true })
  applicationNo!: string;

  @Column()
  readerId!: string;

  @Column()
  readerName!: string;

  @Column()
  bookTitle!: string;

  @Column({ nullable: true })
  isbn?: string;

  @Column()
  sourceLibrary!: string;

  @Column()
  targetLibrary!: string;

  @Column({
    type: 'simple-enum',
    enum: BorrowType,
    default: BorrowType.INTER_LIBRARY
  })
  borrowType!: BorrowType;

  @Column({
    type: 'simple-enum',
    enum: BorrowStatus,
    default: BorrowStatus.PENDING
  })
  status!: BorrowStatus;

  @Column({ type: 'datetime', nullable: true })
  borrowDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  returnDate?: Date;

  @Column({ type: 'int', default: 0 })
  renewalCount!: number;

  @Column({ type: 'boolean', default: false })
  isOverdue!: boolean;

  @Column({ type: 'boolean', default: false })
  isDamaged!: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overdueFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  damageFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalFee!: number;

  @Column({ type: 'text', nullable: true })
  externalReference?: string;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: any;

  @Column({ type: 'text', nullable: true })
  batchId?: string;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @OneToMany(() => ExpressOrder, order => order.application)
  expressOrders!: ExpressOrder[];

  @OneToMany(() => CompensationRecord, record => record.application)
  compensationRecords!: CompensationRecord[];

  @OneToMany(() => SupervisorComment, comment => comment.application)
  supervisorComments!: SupervisorComment[];
}
