import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum TaxNoticeStatus {
  PENDING = 'pending',
  PAID = 'paid',
  DISPUTED = 'disputed',
  WAIVED = 'waived',
  OVERDUE = 'overdue'
}

@Entity()
export class TaxNotice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  noticeNo: string;

  @Column()
  declarationId: string;

  @Column()
  packageNo: string;

  @Column('decimal', { precision: 10, scale: 2 })
  taxAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  vatAmount: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  dutyAmount: number | null;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  lateFee: number | null;

  @Column()
  taxCategory: string;

  @Column({ type: 'datetime' })
  issueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'datetime', nullable: true })
  paymentDate: Date | null;

  @Column({
    type: 'simple-enum',
    enum: TaxNoticeStatus,
    default: TaxNoticeStatus.PENDING
  })
  status: TaxNoticeStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string | null;

  @Column({ type: 'text', nullable: true })
  disputeReason: string | null;

  @Column({ type: 'varchar', nullable: true })
  disputedBy: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'varchar', nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  originalPackageNo: string | null;

  @Column({ default: false })
  isSplitTax: boolean;

  @Column({ type: 'varchar', nullable: true })
  splitFromNoticeId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
