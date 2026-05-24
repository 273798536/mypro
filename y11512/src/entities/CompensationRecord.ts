import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { BorrowApplication } from './BorrowApplication';

export enum CompensationType {
  OVERDUE = 'overdue',
  DAMAGE = 'damage',
  LOST = 'lost',
  OTHER = 'other'
}

export enum CompensationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAID = 'paid',
  WAIVED = 'waived',
  CANCELLED = 'cancelled'
}

@Entity()
export class CompensationRecord extends BaseEntity {
  @Column({ unique: true })
  recordNo!: string;

  @Column()
  applicationId!: string;

  @ManyToOne(() => BorrowApplication, application => application.compensationRecords)
  @JoinColumn({ name: 'applicationId' })
  application!: BorrowApplication;

  @Column({
    type: 'simple-enum',
    enum: CompensationType
  })
  compensationType!: CompensationType;

  @Column({
    type: 'simple-enum',
    enum: CompensationStatus,
    default: CompensationStatus.PENDING
  })
  status!: CompensationStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  evidence?: string;

  @Column({ type: 'datetime', nullable: true })
  confirmTime?: Date;

  @Column({ type: 'datetime', nullable: true })
  paidTime?: Date;

  @Column({ type: 'text', nullable: true })
  paymentMethod?: string;

  @Column({ type: 'text', nullable: true })
  paymentReference?: string;

  @Column({ type: 'simple-json', nullable: true })
  rawData?: any;
}
