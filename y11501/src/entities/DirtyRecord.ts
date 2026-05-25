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

  @Column({ type: 'varchar', nullable: true })
  fieldName: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  originalValue: string | null;

  @Column({ type: 'text', nullable: true })
  expectedValue: string | null;

  @Column({ type: 'text', nullable: true })
  suggestedFix: string | null;

  @Column({
    type: 'simple-enum',
    enum: RecordStatus,
    default: RecordStatus.DIRTY
  })
  status: RecordStatus;

  @Column({ type: 'text', nullable: true })
  fixedValue: string | null;

  @Column({ type: 'varchar', nullable: true })
  fixedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  fixedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  originalRowData: string | null;

  @Column({ type: 'int', nullable: true })
  originalRowNumber: number | null;

  @Column({ type: 'text', nullable: true })
  reviewRemark: string | null;

  @Column({ type: 'varchar', nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
