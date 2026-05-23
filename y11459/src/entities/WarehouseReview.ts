import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Batch } from './Batch';

export type ReviewResult = 'normal' | 'less_shipped' | 'defective' | 'unprocessable';

@Entity('warehouse_reviews')
export class WarehouseReview extends BaseEntity {
  @Column({ name: 'batch_id' })
  batchId: string;

  @ManyToOne(() => Batch, batch => batch.warehouseReviews)
  @JoinColumn({ name: 'batch_id' })
  batch: Batch;

  @Column({ name: 'review_no', unique: true })
  reviewNo: string;

  @Column({ name: 'order_no' })
  orderNo: string;

  @Column({ name: 'warehouse_code' })
  warehouseCode: string;

  @Column({ name: 'warehouse_name' })
  warehouseName: string;

  @Column({ name: 'reviewer_id' })
  reviewerId: string;

  @Column({ name: 'reviewer_name' })
  reviewerName: string;

  @Column({ name: 'product_sku' })
  productSku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'actual_quantity', type: 'int' })
  actualQuantity: number;

  @Column({ name: 'should_quantity', type: 'int' })
  shouldQuantity: number;

  @Column({ name: 'diff_quantity', type: 'int' })
  diffQuantity: number;

  @Column({ name: 'compensation_amount', type: 'decimal', precision: 10, scale: 2 })
  compensationAmount: number;

  @Column({
    type: 'simple-enum',
    enum: ['normal', 'less_shipped', 'defective', 'unprocessable'],
    default: 'normal'
  })
  reviewResult: ReviewResult;

  @Column({ name: 'review_remark', type: 'text', nullable: true })
  reviewRemark: string;

  @Column({ name: 'is_matched', default: false })
  isMatched: boolean;

  @Column({ name: 'matched_refund_id', nullable: true })
  matchedRefundId: string;

  @Column({ name: 'reviewed_at', type: 'datetime' })
  reviewedAt: Date;
}
