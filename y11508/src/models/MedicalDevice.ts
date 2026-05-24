import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { DeviceStatus } from '../types';

@Entity('medical_devices')
export class MedicalDeviceEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  deviceCode: string;

  @Column()
  deviceName: string;

  @Column()
  department: string;

  @Column({
    type: 'text',
    default: DeviceStatus.NORMAL
  })
  status: DeviceStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}