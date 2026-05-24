import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RecordStatus } from '../types';

@Entity('calibration_certificates')
export class CalibrationCertificateEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  certificateNo: string;

  @Column()
  deviceId: string;

  @Column()
  deviceCode: string;

  @Column()
  calibrationAgency: string;

  @Column()
  calibrationDate: Date;

  @Column()
  expiryDate: Date;

  @Column('simple-json')
  calibrationItems: string[];

  @Column({
    type: 'text'
  })
  conclusion: 'pass' | 'fail' | 'conditional';

  @Column({
    type: 'text',
    default: RecordStatus.DRAFT
  })
  status: RecordStatus;

  @Column({ nullable: true })
  fileUrl: string;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}