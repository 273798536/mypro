import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { RepairOrder } from './RepairOrder';
import { PartScan } from './PartScan';
import { ReceiptPhoto } from './ReceiptPhoto';
import { ExternalReceipt } from './ExternalReceipt';
import { ChangeHistory } from './ChangeHistory';
import { LedgerStatus, DataQuality } from '../types/enums';

@Entity('ledgers')
export class Ledger extends BaseEntity {
  @Column({ name: 'ledger_no', unique: true })
  ledgerNo: string;

  @Column({
    type: 'simple-enum',
    enum: LedgerStatus,
    default: LedgerStatus.DRAFT,
  })
  status: LedgerStatus = LedgerStatus.DRAFT;

  @Column({
    type: 'simple-enum',
    enum: DataQuality,
    default: DataQuality.VALID,
    name: 'data_quality',
  })
  dataQuality: DataQuality = DataQuality.VALID;

  @Column({ name: 'repair_order_id', nullable: true })
  repairOrderId?: string;

  @ManyToOne(() => RepairOrder, (order) => order.ledgers, { nullable: true })
  @JoinColumn({ name: 'repair_order_id' })
  repairOrder?: RepairOrder;

  @Column({ name: 'engineer_id', nullable: true })
  engineerId?: string;

  @Column({ name: 'engineer_name', nullable: true })
  engineerName?: string;

  @Column({ name: 'submit_time', nullable: true })
  submitTime?: Date;

  @Column({ name: 'confirm_time', nullable: true })
  confirmTime?: Date;

  @Column({ name: 'audit_time', nullable: true })
  auditTime?: Date;

  @Column({ name: 'reject_reason', nullable: true, type: 'text' })
  rejectReason?: string;

  @Column({ name: 'reject_by', nullable: true })
  rejectBy?: string;

  @Column({ name: 'confirm_by', nullable: true })
  confirmBy?: string;

  @Column({ name: 'audit_by', nullable: true })
  auditBy?: string;

  @Column({ name: 'change_reason', nullable: true, type: 'text' })
  changeReason?: string;

  @Column({ name: 'version', default: 1 })
  version: number = 1;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'data_hash', nullable: true })
  dataHash?: string;

  @OneToMany(() => PartScan, (scan) => scan.ledger, { cascade: true })
  partScans: PartScan[];

  @OneToMany(() => ReceiptPhoto, (photo) => photo.ledger, { cascade: true })
  receiptPhotos: ReceiptPhoto[];

  @OneToMany(() => ExternalReceipt, (receipt) => receipt.ledger, { cascade: true })
  externalReceipts: ExternalReceipt[];

  @OneToMany(() => ChangeHistory, (history) => history.ledger, { cascade: true })
  changeHistories: ChangeHistory[];
}
