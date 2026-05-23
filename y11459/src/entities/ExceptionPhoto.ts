import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { LeaderRefund } from './LeaderRefund';

@Entity('exception_photos')
export class ExceptionPhoto extends BaseEntity {
  @Column({ name: 'refund_id', nullable: true })
  refundId: string;

  @ManyToOne(() => LeaderRefund, refund => refund.exceptionPhotos, { nullable: true })
  @JoinColumn({ name: 'refund_id' })
  leaderRefund: LeaderRefund;

  @Column({ name: 'batch_id', nullable: true })
  batchId: string;

  @Column({ name: 'file_name' })
  fileName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column({ name: 'photo_type', nullable: true })
  photoType: string;

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string;

  @Column({ name: 'description', nullable: true, type: 'text' })
  description: string;
}
