import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum CommentDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
  REVISE = 'revise',
  MANUAL_OVERRIDE = 'manual_override',
  ESCALATE = 'escalate'
}

@Entity()
export class SupervisorComment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  declarationId: string;

  @Column({ nullable: true })
  taxNoticeId: string;

  @Column({ nullable: true })
  trajectoryNodeId: string;

  @Column()
  supervisorId: string;

  @Column()
  supervisorName: string;

  @Column({
    type: 'simple-enum',
    enum: CommentDecision
  })
  decision: CommentDecision;

  @Column({ type: 'text' })
  comment: string;

  @Column('simple-json', { nullable: true })
  previousState: Record<string, any>;

  @Column('simple-json', { nullable: true })
  newState: Record<string, any>;

  @Column({ default: false })
  isManualOverride: boolean;

  @Column({ nullable: true })
  overrideReason: string;

  @CreateDateColumn()
  createdAt: Date;
}
