import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';

export enum TemperatureStatus {
  NORMAL = 'normal',
  WARNING = 'warning',
  ABNORMAL = 'abnormal',
}

@Entity('temperature_records')
export class TemperatureRecord extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 50 })
  batchNo: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  potNo: string;

  @Column({ type: 'datetime' })
  recordTime: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  temperature: number;

  @Column({ type: 'varchar', length: 50 })
  deviceId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  deviceLocation: string;

  @Column({
    type: 'simple-enum',
    enum: TemperatureStatus,
    default: TemperatureStatus.NORMAL,
  })
  status: TemperatureStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  minThreshold: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  maxThreshold: number;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  recordedBy: string;
}