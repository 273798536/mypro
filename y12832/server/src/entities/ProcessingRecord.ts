import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Sample } from './Sample';

export type RecordType = 'quality_check' | 'difference_analysis' | 'exception_review' | 'status_update' | 'timepoint_fix' | 'duplicate_handle';
export type RecordResult = 'pending' | 'pass' | 'fail' | 'warning' | 'fixed';

@Entity()
export class ProcessingRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  sampleId: number;

  @Column()
  recordType: RecordType;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  analysisData: string;

  @Column({ type: 'text', nullable: true })
  differenceDetails: string;

  @Column({ type: 'text', nullable: true })
  exceptionDetails: string;

  @Column({ default: 'pending' })
  result: RecordResult;

  @Column({ type: 'text', nullable: true })
  handlingOpinion: string;

  @Column({ type: 'text', nullable: true })
  reviewComment: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @Column({ default: false })
  isReviewed: boolean;

  @ManyToOne(() => Sample, sample => sample.processingRecords)
  @JoinColumn({ name: 'sampleId' })
  sample: Sample;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  createdBy: string;
}
