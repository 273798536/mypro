import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum SampleStatus {
  CREATED = 'created',
  SUBMITTED = 'submitted',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  FROZEN = 'frozen',
  ARCHIVED = 'archived',
}

@Entity('sample_labels')
export class SampleLabel extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 50 })
  batchNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  potNo: string;

  @Column({ type: 'varchar', length: 100 })
  productName: string;

  @Column({ type: 'datetime' })
  productionTime: Date;

  @Column({ type: 'varchar', length: 50 })
  producer: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({
    type: 'simple-enum',
    enum: SampleStatus,
    default: SampleStatus.CREATED,
  })
  status: SampleStatus;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  shelfNo: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceSystem: string;
}