import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';

@Entity('receipt_photos')
export class ReceiptPhoto extends BaseEntity {
  @Column({ name: 'photo_url' })
  photoUrl: string;

  @Column({ name: 'photo_hash', nullable: true })
  photoHash?: string;

  @Column({ name: 'photo_size', nullable: true })
  photoSize?: number;

  @Column({ name: 'photo_type', nullable: true })
  photoType?: string;

  @Column({ name: 'capture_time', nullable: true })
  captureTime?: Date;

  @Column({ name: 'capture_location', nullable: true })
  captureLocation?: string;

  @Column({ name: 'uploader_id', nullable: true })
  uploaderId?: string;

  @Column({ name: 'uploader_name', nullable: true })
  uploaderName?: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'simple-json', nullable: true })
  exifData?: Record<string, any>;

  @Column({ name: 'ledger_id', nullable: true })
  ledgerId?: string;

  @ManyToOne(() => Ledger, (ledger) => ledger.receiptPhotos, { nullable: true })
  @JoinColumn({ name: 'ledger_id' })
  ledger?: Ledger;
}
