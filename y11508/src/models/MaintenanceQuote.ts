import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RecordStatus } from '../types';

@Entity('maintenance_quotes')
export class MaintenanceQuoteEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  quoteNo: string;

  @Column()
  deviceId: string;

  @Column()
  deviceCode: string;

  @Column()
  vendor: string;

  @Column()
  quoteDate: Date;

  @Column('decimal')
  estimatedCost: number;

  @Column('simple-json')
  maintenanceItems: string[];

  @Column({
    type: 'text',
    default: RecordStatus.DRAFT
  })
  status: RecordStatus;

  @Column({
    type: 'text',
    default: 'pending'
  })
  approvalStatus: 'pending' | 'approved' | 'rejected';

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}