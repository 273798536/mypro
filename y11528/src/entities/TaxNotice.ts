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
  vatAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  dutyAmount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  lateFee: number;

  @Column()
  taxCategory: string;

  @Column({ type: 'datetime' })
  issueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  paymentDate: Date;

  @Column({
    type: 'simple-enum',
    enum: TaxNoticeStatus,
    default: TaxNoticeStatus.PENDING
  })
  status: TaxNoticeStatus;

  @Column({ nullable: true })
  paymentReference: string;

  @Column({ nullable: true, type: 'text' })
  disputeReason: string;

  @Column({ nullable: true })
  disputedBy: string;

  @Column({ nullable: true, type: 'text' })
  resolutionNotes: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ nullable: true })
  originalPackageNo: string;

  @Column({ default: false })
  isSplitTax: boolean;

  @Column({ nullable: true })
  splitFromNoticeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
