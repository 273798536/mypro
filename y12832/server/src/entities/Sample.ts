import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ProcessingRecord } from './ProcessingRecord';

export type SampleStatus = 'imported' | 'reviewing' | 'reviewed' | 'processing' | 'completed' | 'exported';
export type QualityStatus = 'pass' | 'warning' | 'fail';

@Entity()
export class Sample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index({ unique: false })
  barcode: string;

  @Column()
  sampleName: string;

  @Column()
  bacteriaName: string;

  @Column({ type: 'text', nullable: true })
  resistanceProfile: string;

  @Column({ nullable: true })
  collectionTime: string;

  @Column({ nullable: true })
  testTime: string;

  @Column({ nullable: true })
  sequencingBatch: string;

  @Column({ default: 'imported' })
  status: SampleStatus;

  @Column({ default: 'pass' })
  qualityStatus: QualityStatus;

  @Column({ type: 'text', nullable: true })
  qualityNotes: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false })
  hasDuplicateBarcode: boolean;

  @Column({ type: 'boolean', default: false })
  hasMissingTimePoint: boolean;

  @Column({ type: 'text', nullable: true })
  rawData: string;

  @OneToMany(() => ProcessingRecord, record => record.sample)
  processingRecords: ProcessingRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  importedBy: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;
}
