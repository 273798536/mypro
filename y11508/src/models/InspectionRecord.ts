import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RecordStatus } from '../types';

@Entity('inspection_records')
export class InspectionRecordEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  recordNo: string;

  @Column()
  deviceId: string;

  @Column()
  deviceCode: string;

  @Column()
  inspector: string;

  @Column()
  inspectionDate: Date;

  @Column('simple-json')
  inspectionItems: Record<string, any>;

  @Column()
  conclusion: string;

  @Column({
    type: 'text',
    default: RecordStatus.DRAFT
  })
  status: RecordStatus;

  @Column({ nullable: true })
  remarks: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}