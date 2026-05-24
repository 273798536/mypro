import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum ComplaintStatus {
  REPORTED = 'reported',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ComplaintType {
  TASTE = 'taste',
  QUALITY = 'quality',
  PACKAGING = 'packaging',
  TEMPERATURE = 'temperature',
  OTHER = 'other',
}

@Entity('store_complaints')
export class StoreComplaint extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 50 })
  complaintNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  batchNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50, nullable: true })
  potNo: string;

  @Column({ type: 'varchar', length: 100 })
  storeName: string;

  @Column({ type: 'varchar', length: 50 })
  storeCode: string;

  @Column({ type: 'simple-enum', enum: ComplaintType })
  complaintType: ComplaintType;

  @Column({ type: 'datetime' })
  incidentTime: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reporter: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reporterPhone: string;

  @Column({
    type: 'simple-enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.REPORTED,
  })
  status: ComplaintStatus;

  @Column({ type: 'text', nullable: true })
  investigationResult: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  handler: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedTime: Date;

  @Column({ type: 'simple-json', nullable: true })
  attachments: string[];

  @Column({ type: 'int', default: 0 })
  affectedQuantity: number;
}