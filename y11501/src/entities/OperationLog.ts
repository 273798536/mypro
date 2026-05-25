import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OperationType {
  INIT = 'init',
  IMPORT = 'import',
  CHECK = 'check',
  FIX = 'fix',
  REVIEW = 'review',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
  LOGIN = 'login',
  CREATE_USER = 'create_user'
}

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'simple-enum',
    enum: OperationType
  })
  operationType: OperationType;

  @Column()
  @Index()
  operator: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'varchar', nullable: true })
  batchId: string | null;

  @Column({ type: 'varchar', nullable: true })
  recordId: string | null;

  @Column({ default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
