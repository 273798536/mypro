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

  @Column({ type: 'varchar', nullable: true })
  taxNoticeId: string | null;

  @Column({ type: 'varchar', nullable: true })
  trajectoryNodeId: string | null;

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
  previousState: Record<string, any> | null;

  @Column('simple-json', { nullable: true })
  newState: Record<string, any> | null;

  @Column({ default: false })
  isManualOverride: boolean;

  @Column({ type: 'varchar', nullable: true })
  overrideReason: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
