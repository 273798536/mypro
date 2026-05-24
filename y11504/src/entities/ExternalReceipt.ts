import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { ReceiptSource } from '../types/enums';

@Entity('external_receipts')
export class ExternalReceipt extends BaseEntity {
  @Column({ name: 'receipt_no', nullable: true })
  receiptNo?: string;

  @Column({
    type: 'simple-enum',
    enum: ReceiptSource,
    default: ReceiptSource.EXTERNAL,
    name: 'source',
  })
  source: ReceiptSource = ReceiptSource.EXTERNAL;

  @Column({ name: 'source_system', nullable: true })
  sourceSystem?: string;

  @Column({ name: 'received_at', nullable: true })
  receivedAt?: Date;

  @Column({ name: 'sender', nullable: true })
  sender?: string;

  @Column({ name: 'receiver', nullable: true })
  receiver?: string;

  @Column({ name: 'content', type: 'text', nullable: true })
  content?: string;

  @Column({ name: 'attachment_url', nullable: true })
  attachmentUrl?: string;

  @Column({ name: 'attachment_hash', nullable: true })
  attachmentHash?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'ledger_id', nullable: true })
  ledgerId?: string;

  @ManyToOne(() => Ledger, (ledger) => ledger.externalReceipts, { nullable: true })
  @JoinColumn({ name: 'ledger_id' })
  ledger?: Ledger;
}
