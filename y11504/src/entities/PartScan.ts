import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { PartType } from '../types/enums';

@Entity('part_scans')
export class PartScan extends BaseEntity {
  @Column({ name: 'part_code' })
  partCode: string;

  @Column({ name: 'part_name', nullable: true })
  partName?: string;

  @Column({
    type: 'simple-enum',
    enum: PartType,
    default: PartType.NORMAL,
    name: 'part_type',
  })
  partType: PartType = PartType.NORMAL;

  @Column({ name: 'scan_time', nullable: true })
  scanTime?: Date;

  @Column({ name: 'scan_location', nullable: true })
  scanLocation?: string;

  @Column({ name: 'scanner_id', nullable: true })
  scannerId?: string;

  @Column({ name: 'scanner_name', nullable: true })
  scannerName?: string;

  @Column({ name: 'quantity', default: 1 })
  quantity: number = 1;

  @Column({ name: 'batch_no', nullable: true })
  batchNo?: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'ledger_id', nullable: true })
  ledgerId?: string;

  @ManyToOne(() => Ledger, (ledger) => ledger.partScans, { nullable: true })
  @JoinColumn({ name: 'ledger_id' })
  ledger?: Ledger;
}
