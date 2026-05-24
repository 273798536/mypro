import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { RecordStatus, ImportSource } from '../types';

@Entity('secondary_confirms')
export class SecondaryConfirmEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  confirmNo: string;

  @Column({
    type: 'text'
  })
  relatedRecordType: ImportSource;

  @Column()
  relatedRecordId: string;

  @Column()
  deviceId: string;

  @Column()
  deviceCode: string;

  @Column()
  confirmer: string;

  @Column()
  confirmDate: Date;

  @Column('text')
  confirmContent: string;

  @Column({
    type: 'text',
    default: RecordStatus.DRAFT
  })
  status: RecordStatus;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}