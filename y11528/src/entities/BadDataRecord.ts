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
  errorDetails: Record<string, any> | null;

  @Column({ type: 'varchar', nullable: true })
  sourceFile: string | null;

  @Column({ type: 'integer', nullable: true })
  sourceRow: number | null;

  @Column({ type: 'varchar', nullable: true })
  reportedBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  fixedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  fixedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  fixNotes: string | null;

  @Column({ type: 'varchar', nullable: true })
  correctionRecordId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
