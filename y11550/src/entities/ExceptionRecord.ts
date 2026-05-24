import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Receipt } from './Receipt';
import { DataSource, ExceptionType } from '../types';

@Entity('exception_records')
export class ExceptionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  receiptId: string;

  @Column({ type: 'simple-enum', enum: DataSource })
  source: DataSource;

  @Column({ type: 'simple-enum', enum: ExceptionType })
  type: ExceptionType;

  @Column()
  description: string;

  @Column({ type: 'text', nullable: true })
  detail?: string;

  @Column({ type: 'simple-json' })
  rawData: Record<string, any>;

  @Column({ nullable: true })
  relatedRecordId?: string;

  @Column({ default: false })
  resolved: boolean;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolvedBy?: string;

  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ default: false })
  affectsSummary: boolean;

  @Column({ default: false })
  isRetained: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Receipt, receipt => receipt.exceptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiptId' })
  receipt: Receipt;
}
