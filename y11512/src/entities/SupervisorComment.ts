import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { BorrowApplication } from './BorrowApplication';

export enum CommentType {
  FEE_ADJUSTMENT = 'fee_adjustment',
  STATUS_CHANGE = 'status_change',
  EXCEPTION_HANDLING = 'exception_handling',
  COMPENSATION_DECISION = 'compensation_decision',
  GENERAL_NOTE = 'general_note'
}

@Entity()
export class SupervisorComment extends BaseEntity {
  @Column()
  applicationId!: string;

  @ManyToOne(() => BorrowApplication, application => application.supervisorComments)
  @JoinColumn({ name: 'applicationId' })
  application!: BorrowApplication;

  @Column({
    type: 'simple-enum',
    enum: CommentType,
    default: CommentType.GENERAL_NOTE
  })
  commentType!: CommentType;

  @Column()
  supervisorName!: string;

  @Column()
  supervisorId!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'simple-json', nullable: true })
  changes?: any;

  @Column({ type: 'boolean', default: false })
  isDecision!: boolean;

  @Column({ type: 'datetime', nullable: true })
  decisionTime?: Date;
}
