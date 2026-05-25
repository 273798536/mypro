import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { DataSourceType } from '../types';
import { RepairOrder } from './RepairOrder';
import { SparePartScan } from './SparePartScan';
import { CustomerReceipt } from './CustomerReceipt';
import { ManualPriceAdjust } from './ManualPriceAdjust';
import { ShiftRecord } from './ShiftRecord';

@Entity('import_batches')
export class ImportBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchNumber: string;

  @Column({
    type: 'simple-enum',
    enum: DataSourceType
  })
  sourceType: DataSourceType;

  @Column()
  sourceFileName: string;

  @Column()
  importedBy: string;

  @Column({ default: 0 })
  totalRecords: number;

  @Column({ default: 0 })
  validRecords: number;

  @Column({ default: 0 })
  dirtyRecords: number;

  @Column({ default: false })
  isProcessed: boolean;

  @Column({ type: 'text', nullable: true })
  remark: string | null;

  @OneToMany(() => RepairOrder, ro => ro.importBatch)
  repairOrders: RepairOrder[];

  @OneToMany(() => SparePartScan, sp => sp.importBatch)
  sparePartScans: SparePartScan[];

  @OneToMany(() => CustomerReceipt, cr => cr.importBatch)
  customerReceipts: CustomerReceipt[];

  @OneToMany(() => ManualPriceAdjust, mpa => mpa.importBatch)
  manualPriceAdjusts: ManualPriceAdjust[];

  @OneToMany(() => ShiftRecord, sr => sr.importBatch)
  shiftRecords: ShiftRecord[];

  @CreateDateColumn()
  createdAt: Date;
}
