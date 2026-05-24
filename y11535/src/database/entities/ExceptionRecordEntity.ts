import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ExceptionStatus, ExceptionType, SourceType, ImportSource, StateTransition, ReviewRecord, Attachment } from '../../types';

@Entity('exception_records')
export class ExceptionRecordEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index()
  batchId: string;

  @Column()
  @Index()
  employeeId: string;

  @Column()
  employeeName: string;

  @Column()
  @Index()
  department: string;

  @Column()
  @Index()
  trainingId: string;

  @Column()
  trainingName: string;

  @Column({ type: 'datetime' })
  trainingDate: Date;

  @Column({
    type: 'simple-enum',
    enum: ExceptionType
  })
  exceptionType: ExceptionType;

  @Column({
    type: 'simple-enum',
    enum: ExceptionStatus,
    default: ExceptionStatus.DRAFT
  })
  @Index()
  status: ExceptionStatus;

  @Column({ type: 'json' })
  importSource: ImportSource;

  @Column({ type: 'json' })
  originalEvidence: any;

  @Column({ type: 'json' })
  currentEvidence: any;

  @Column({ type: 'json', default: '[]' })
  reviewHistory: ReviewRecord[];

  @Column({ type: 'json', default: '[]' })
  stateTransitions: StateTransition[];

  @Column({ type: 'json', default: '[]' })
  attachments: Attachment[];

  @Column({ default: false })
  isFrozen: boolean;

  @Column({ type: 'datetime', nullable: true })
  frozenAt?: Date;

  @Column({ nullable: true })
  frozenBy?: string;

  @Column({ nullable: true })
  freezeReason?: string;

  @Column({ type: 'datetime', nullable: true })
  settledAt?: Date;

  @Column({ nullable: true })
  settledBy?: string;

  @Column({ type: 'datetime', nullable: true })
  archivedAt?: Date;

  @Column()
  createdBy: string;

  @Column()
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
