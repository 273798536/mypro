import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';

@Entity('customer_sign_photos')
export class CustomerSignPhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  photoNo: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  customerName: string;

  @Column({ type: 'datetime', nullable: true })
  signTime: Date;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'text', nullable: true })
  rawContent: string;

  @Column({ default: false })
  isDirty: boolean;

  @ManyToOne(() => Batch, batch => batch.customerSignPhotos, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column({ nullable: true })
  batchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
