import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { RepairOrder } from './repair-order.entity';
import { SparePartScan } from './spare-part-scan.entity';
import { CustomerSignPhoto } from './customer-sign-photo.entity';
import { ScanDetail } from './scan-detail.entity';
import { DirtyRecord } from './dirty-record.entity';
import { User } from './user.entity';

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  batchNo: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'simple-enum',
    enum: BatchStatus,
    default: BatchStatus.DRAFT,
  })
  status: BatchStatus;

  @Column({ type: 'datetime', nullable: true })
  statusBeforeFrozen: BatchStatus;

  @Column({ type: 'text', nullable: true })
  freezeReason: string;

  @Column({ default: 0 })
  totalRepairOrders: number;

  @Column({ default: 0 })
  totalSparePartScans: number;

  @Column({ default: 0 })
  totalCustomerSignPhotos: number;

  @Column({ default: 0 })
  totalScanDetails: number;

  @Column({ default: 0 })
  totalDirtyRecords: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'text', nullable: true })
  reviewOpinion: string;

  @Column({ type: 'text', nullable: true })
  manualReason: string;

  @ManyToOne(() => User)
  @JoinColumn()
  createdBy: User;

  @Column()
  createdById: string;

  @Column({ nullable: true })
  createdByName: string;

  @OneToMany(() => RepairOrder, repairOrder => repairOrder.batch)
  repairOrders: RepairOrder[];

  @OneToMany(() => SparePartScan, sparePartScan => sparePartScan.batch)
  sparePartScans: SparePartScan[];

  @OneToMany(() => CustomerSignPhoto, customerSignPhoto => customerSignPhoto.batch)
  customerSignPhotos: CustomerSignPhoto[];

  @OneToMany(() => ScanDetail, scanDetail => scanDetail.batch)
  scanDetails: ScanDetail[];

  @OneToMany(() => DirtyRecord, dirtyRecord => dirtyRecord.batch)
  dirtyRecords: DirtyRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
