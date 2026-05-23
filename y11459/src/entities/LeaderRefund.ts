import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Batch } from './Batch';
import { Remark } from './Remark';
import { ExceptionPhoto } from './ExceptionPhoto';

export type RefundStatus = 'normal' | 'pending_review' | 'unprocessable' | 'matched' | 'mismatched';
export type RefundType = 'less_shipped' | 'defective' | 'other';

@Entity('leader_refunds')
export class LeaderRefund extends BaseEntity {
  @Column({ name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => Batch, batch => batch.leaderRefunds)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({ name: 'refund_no', unique: true })
  refundNo: string;

  @Column({ name: 'order_no' })
  orderNo: string;

  @Column({ name: 'leader_id' })
  leaderId: string;

  @Column({ name: 'leader_name' })
  leaderName: string;

  @Column({ name: 'leader_phone' })
  leaderPhone: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'user_name' })
  userName: string;

  @Column({ name: 'user_phone' })
  userPhone: string;

  @Column({
    type: 'simple-enum',
    enum: ['less_shipped', 'defective', 'other'],
    default: 'other'
  })
  refundType: RefundType;

  @Column({ name: 'product_sku' })
  productSku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2 })
  refundAmount: number;

  @Column({ name: 'refund_reason', type: 'text' })
  refundReason: string;

  @Column({
    type: 'simple-enum',
    enum: ['normal', 'pending_review', 'unprocessable', 'matched', 'mismatched'],
    default: 'pending_review'
  })
  status: RefundStatus;

  @Column({ name: 'is_matched', default: false })
  isMatched: boolean;

  @Column({ name: 'matched_review_id', nullable: true })
  matchedReviewId: string;

  @Column({ name: 'matched_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  matchedAmount: number;

  @Column({ name: 'diff_amount', type: 'decimal', precision: 10, scale: 2, default: 0 })
  diffAmount: number;

  @Column({ name: 'process_remark', nullable: true, type: 'text' })
  processRemark: string;

  @OneToMany(() => Remark, remark => remark.leaderRefund)
  remarks: Remark[];

  @OneToMany(() => ExceptionPhoto, photo => photo.leaderRefund)
  exceptionPhotos: ExceptionPhoto[];
}
