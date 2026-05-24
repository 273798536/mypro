import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { CompensationStatus, OperationType } from '../types/enums';
import { CompensationRecord } from './CompensationRecord';

@Entity('status_histories')
export class StatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  recordId!: string;

  @ManyToOne(() => CompensationRecord, record => record.statusHistories)
  @JoinColumn({ name: 'recordId' })
  compensationRecord!: CompensationRecord;

  @Column({
    type: 'simple-enum',
    enum: CompensationStatus
  })
  fromStatus!: CompensationStatus;

  @Column({
    type: 'simple-enum',
    enum: CompensationStatus
  })
  toStatus!: CompensationStatus;

  @Column({
    type: 'simple-enum',
    enum: OperationType
  })
  operationType!: OperationType;

  @Column({ type: 'text' })
  reason!: string;

  @Column()
  operatorId!: string;

  @Column()
  operatorName!: string;

  @Column({ type: 'simple-json', nullable: true })
  extraData?: Record<string, any>;

  @CreateDateColumn()
  operatedAt!: Date;
}
