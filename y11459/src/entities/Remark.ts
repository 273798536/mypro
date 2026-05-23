import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { LeaderRefund } from './LeaderRefund';

export type RemarkType = 'user' | 'customer_service' | 'system';

@Entity('remarks')
export class Remark extends BaseEntity {
  @Column({ name: 'refund_id', nullable: true })
  refundId: string;

  @ManyToOne(() => LeaderRefund, refund => refund.remarks, { nullable: true })
  @JoinColumn({ name: 'refund_id' })
  leaderRefund: LeaderRefund;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @Column({
    type: 'simple-enum',
    enum: ['user', 'customer_service', 'system'],
    default: 'user'
  })
  remarkType: RemarkType;

  @Column({ name: 'operator_id', nullable: true })
  operatorId: string;

  @Column({ name: 'operator_name', nullable: true })
  operatorName: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean;
}
