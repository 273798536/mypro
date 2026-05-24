import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DirtyRecordType, RecordStatus } from '../types';

@Entity('dirty_records')
export class DirtyRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sourceType: string;

  @Column()
  sourceRecordId: string;

  @Column({
    type: 'simple-enum',
    enum: DirtyRecordType
  })
  dirtyType: DirtyRecordType;

  @Column({ nullable: true })
  fieldName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  originalValue: string;

  @Column({ type: 'text', nullable: true })
  expectedValue: string;

  @Column({ type: 'text', nullable: true })
  suggestedFix: string;

  @Column({
    type: 'simple-enum',
    enum: RecordStatus,
    default: RecordStatus.DIRTY
  })
  status: RecordStatus;

  @Column({ type: 'text', nullable: true })
  fixedValue: string;

  @Column({ nullable: true })
  fixedBy: string;

  @Column({ type: 'datetime', nullable: true })
  fixedAt: Date;

  @Column({ type: 'text', nullable: true })
  originalRowData: string;

  @Column({ nullable: true })
  originalRowNumber: number;

  @Column({ type: 'text', nullable: true })
  reviewRemark: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
