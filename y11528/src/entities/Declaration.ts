import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { TrajectoryNode } from './TrajectoryNode';

export enum DeclarationStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_SUPPLEMENT = 'needs_supplement'
}

@Entity()
export class Declaration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  declarationNo: string;

  @Column()
  packageNo: string;

  @Column()
  senderName: string;

  @Column()
  senderAddress: string;

  @Column()
  receiverName: string;

  @Column()
  receiverAddress: string;

  @Column('decimal', { precision: 10, scale: 2 })
  declaredValue: number;

  @Column()
  currency: string;

  @Column()
  weight: number;

  @Column()
  itemDescription: string;

  @Column()
  hsCode: string;

  @Column({ default: false })
  hasAttachment: boolean;

  @Column({ nullable: true })
  attachmentUrl: string;

  @Column({
    type: 'simple-enum',
    enum: DeclarationStatus,
    default: DeclarationStatus.DRAFT
  })
  status: DeclarationStatus;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ nullable: true })
  enteredBy: string;

  @Column({ nullable: true })
  reviewedBy: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true, type: 'text' })
  reviewNotes: string;

  @OneToMany(() => TrajectoryNode, node => node.declaration)
  trajectoryNodes: TrajectoryNode[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
