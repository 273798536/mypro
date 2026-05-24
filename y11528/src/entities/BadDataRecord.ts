import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BadDataType {
  VALIDATION_ERROR = 'validation_error',
  DUPLICATE_RECORD = 'duplicate_record',
  MISSING_REQUIRED = 'missing_required',
  INVALID_FORMAT = 'invalid_format',
  DATA_INCONSISTENCY = 'data_inconsistency',
  REFERENCE_NOT_FOUND = 'reference_not_found'
}

export enum BadDataStatus {
  OPEN = 'open',
  FIXED = 'fixed',
  DISCARDED = 'discarded',
  UNDER_REVIEW = 'under_review'
}

@Entity()
export class BadDataRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: BadDataType
  })
  errorType: BadDataType;

  @Column({
    type: 'simple-enum',
    enum: BadDataStatus,
    default: BadDataStatus.OPEN
  })
  status: BadDataStatus;

  @Column()
  sourceType: string;

  @Column('simple-json')
  rawData: Record<string, any>;

  @Column()
  errorMessage: string;

  @Column('simple-json', { nullable: true })
  errorDetails: Record<string, any>;

  @Column({ nullable: true })
  sourceFile: string;

  @Column({ nullable: true })
  sourceRow: number;

  @Column({ nullable: true })
  reportedBy: string;

  @Column({ nullable: true })
  fixedBy: string;

  @Column({ type: 'datetime', nullable: true })
  fixedAt: Date;

  @Column({ nullable: true, type: 'text' })
  fixNotes: string;

  @Column({ nullable: true })
  correctionRecordId: string;

  @CreateDateColumn()
  createdAt: Date;
}
