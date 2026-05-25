import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BusinessIssueType, RecordStatus } from '../types';

@Entity('business_issues')
export class BusinessIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: BusinessIssueType
  })
  issueType: BusinessIssueType;

  @Column()
  sourceType: string;

  @Column({ type: 'varchar', nullable: true })
  repairOrderNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  engineerName: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text', nullable: true })
  relatedRecordIds: string | null;

  @Column({
    type: 'simple-enum',
    enum: RecordStatus,
    default: RecordStatus.PENDING
  })
  status: RecordStatus;

  @Column({ type: 'text', nullable: true })
  handlingSuggestion: string | null;

  @Column({ type: 'text', nullable: true })
  handlingResult: string | null;

  @Column({ type: 'varchar', nullable: true })
  handledBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  handledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
