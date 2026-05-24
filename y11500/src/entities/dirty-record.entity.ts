import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { DirtyType } from '../common/enums/dirty-type.enum';

@Entity('dirty_records')
export class DirtyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: DirtyType,
  })
  dirtyType: DirtyType;

  @Column()
  sourceType: string;

  @Column()
  sourceId: string;

  @Column({ type: 'text' })
  originalContent: string;

  @Column({ type: 'simple-json', nullable: true })
  conflictFields: string[];

  @Column({ type: 'text', nullable: true })
  handlingOpinion: string;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: 'text', nullable: true })
  resolvedContent: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @ManyToOne(() => Batch, batch => batch.dirtyRecords, { onDelete: 'CASCADE' })
  @JoinColumn()
  batch: Batch;

  @Column({ nullable: true })
  batchId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
