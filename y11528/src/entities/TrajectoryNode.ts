import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Declaration } from './Declaration';

export enum NodeType {
  CUSTOMS_DECLARATION = 'customs_declaration',
  INSPECTION = 'inspection',
  TAX_ASSESSMENT = 'tax_assessment',
  TAX_PAYMENT = 'tax_payment',
  RELEASE = 'release',
  RETURN = 'return',
  SPLIT = 'split',
  EXCEPTION = 'exception'
}

export enum NodeStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

@Entity()
export class TrajectoryNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  declarationId: string;

  @ManyToOne(() => Declaration, declaration => declaration.trajectoryNodes)
  @JoinColumn({ name: 'declarationId' })
  declaration: Declaration;

  @Column({
    type: 'simple-enum',
    enum: NodeType
  })
  nodeType: NodeType;

  @Column({
    type: 'simple-enum',
    enum: NodeStatus,
    default: NodeStatus.PENDING
  })
  status: NodeStatus;

  @Column()
  nodeName: string;

  @Column({ type: 'datetime' })
  occurredAt: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  operator: string;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isAbnormal: boolean;

  @Column({ nullable: true })
  abnormalReason: string;

  @Column({ nullable: true })
  parentPackageNo: string;

  @Column({ nullable: true })
  splitFromNodeId: string;

  @CreateDateColumn()
  createdAt: Date;
}
