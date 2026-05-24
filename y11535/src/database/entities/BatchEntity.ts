import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { SourceFileInfo, FailedRecord } from '../../types';

@Entity('batches')
export class BatchEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index({ unique: true })
  batchNo: string;

  @Column()
  name: string;

  @Column()
  trainingId: string;

  @Column()
  trainingName: string;

  @Column({ type: 'json', default: '[]' })
  sourceFiles: SourceFileInfo[];

  @Column({ default: 0 })
  totalCount: number;

  @Column({ default: 0 })
  successCount: number;

  @Column({ default: 0 })
  failedCount: number;

  @Column({ type: 'json', default: '[]' })
  failedRecords: FailedRecord[];

  @Column({
    type: 'simple-enum',
    enum: ['processing', 'completed', 'partial_failed'],
    default: 'processing'
  })
  status: 'processing' | 'completed' | 'partial_failed';

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;
}
