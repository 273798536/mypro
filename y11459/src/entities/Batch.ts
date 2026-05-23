import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { LeaderRefund } from './LeaderRefund';
import { WarehouseReview } from './WarehouseReview';
import { AsyncTask } from './AsyncTask';

export type BatchStatus = 'draft' | 'submitted' | 'rejected' | 'confirmed' | 'audited';
export type ImportStrategy = 'ignore' | 'overwrite' | 'append';

@Entity('batches')
export class Batch extends BaseEntity {
  @Column({ name: 'batch_no', unique: true })
  batchNo: string;

  @Column({ name: 'city_code' })
  cityCode: string;

  @Column({ name: 'city_name' })
  cityName: string;

  @Column({
    type: 'simple-enum',
    enum: ['draft', 'submitted', 'rejected', 'confirmed', 'audited'],
    default: 'draft'
  })
  status: BatchStatus;

  @Column({ name: 'import_strategy', default: 'ignore' })
  importStrategy: ImportStrategy;

  @Column({ name: 'refund_count', default: 0 })
  refundCount: number;

  @Column({ name: 'review_count', default: 0 })
  reviewCount: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ name: 'matched_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  matchedAmount: number;

  @Column({ name: 'diff_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  diffAmount: number;

  @Column({ name: 'submitted_at', nullable: true, type: 'datetime' })
  submittedAt: Date;

  @Column({ name: 'rejected_at', nullable: true, type: 'datetime' })
  rejectedAt: Date;

  @Column({ name: 'confirmed_at', nullable: true, type: 'datetime' })
  confirmedAt: Date;

  @Column({ name: 'audited_at', nullable: true, type: 'datetime' })
  auditedAt: Date;

  @Column({ name: 'reject_reason', nullable: true, type: 'text' })
  rejectReason: string;

  @Column({ name: 'audit_remark', nullable: true, type: 'text' })
  auditRemark: string;

  @OneToMany(() => LeaderRefund, refund => refund.batch)
  leaderRefunds: LeaderRefund[];

  @OneToMany(() => WarehouseReview, review => review.batch)
  warehouseReviews: WarehouseReview[];

  @OneToMany(() => AsyncTask, task => task.batch)
  asyncTasks: AsyncTask[];
}
