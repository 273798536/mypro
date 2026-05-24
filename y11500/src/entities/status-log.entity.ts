import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { BatchStatus } from '../common/enums/batch-status.enum';

@Entity('status_logs')
export class StatusLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: BatchStatus,
  })
  fromStatus: BatchStatus;

  @Column({
    type: 'simple-enum',
    enum: BatchStatus,
  })
  toStatus: BatchStatus;

  @Column({ type: 'text' })
  reason: string;

  @Column()
  operatorId: string;

  @Column()
  operatorName: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Batch, batch => batch.statusLogs, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column()
  batchId: string;

  @CreateDateColumn()
  operatedAt: Date;
}
