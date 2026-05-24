import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { DataSource } from '../types';

@Entity('restock_photos')
export class RestockPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column()
  cabinetId: string;

  @Column({ nullable: true })
  slotId?: string;

  @Column()
  fileName: string;

  @Column()
  originalName: string;

  @Column()
  filePath: string;

  @Column()
  fileSize: number;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ nullable: true })
  photoType?: string;

  @Column({ type: 'simple-enum', enum: DataSource, default: DataSource.RESTOCK_PHOTO })
  source: DataSource;

  @Column({ type: 'simple-json', nullable: true })
  exifData?: Record<string, any>;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedBy?: string;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt?: Date;

  @Column({ default: false })
  isException: boolean;

  @Column({ type: 'text', nullable: true })
  exceptionReason?: string;

  @Column()
  uploadedBy: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @ManyToOne(() => Receipt, receipt => receipt.restockPhotos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
