import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ReconciliationStatus {
  MATCHED = 'matched',
  MISMATCHED = 'mismatched',
  PARTIAL_MATCH = 'partial_match',
  PENDING_REVIEW = 'pending_review',
  RESOLVED = 'resolved'
}

export enum MismatchType {
  TAX_AMOUNT = 'tax_amount',
  PACKAGE_SPLIT = 'package_split',
  MISSING_TRAJECTORY = 'missing_trajectory',
  DUPLICATE_SUBMISSION = 'duplicate_submission',
  MISSING_ATTACHMENT = 'missing_attachment',
  STATUS_CONFLICT = 'status_conflict',
  HS_CODE_MISMATCH = 'hs_code_mismatch',
  VALUE_DECLARATION = 'value_declaration'
}

@Entity()
export class ReconciliationResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  declarationId: string;

  @Column()
  packageNo: string;

  @Column({
    type: 'simple-enum',
    enum: ReconciliationStatus
  })
  status: ReconciliationStatus;

  @Column('simple-array', { nullable: true })
  mismatchTypes: MismatchType[];

  @Column('simple-json', { nullable: true })
  mismatchDetails: Record<string, any>;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  expectedTaxAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  actualTaxAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  taxDifference: number;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date;

  @Column({ nullable: true, type: 'text' })
  resolutionNotes: string;

  @Column({ default: false })
  hasSplitPackages: boolean;

  @Column('simple-array', { nullable: true })
  relatedPackageNos: string[];

  @Column('simple-json', { nullable: true })
  playbackChain: {
    declaration: any;
    trajectoryNodes: any[];
    taxNotices: any[];
    supervisorComments: any[];
  };

  @Column()
  batchNo: string;

  @CreateDateColumn()
  createdAt: Date;
}
