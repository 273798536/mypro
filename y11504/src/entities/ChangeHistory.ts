import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Ledger } from './Ledger';
import { ChangeAction, LedgerStatus } from '../types/enums';

@Entity('change_histories')
export class ChangeHistory extends BaseEntity {
  @Column({ name: 'ledger_id', nullable: true })
  ledgerId?: string;

  @ManyToOne(() => Ledger, (ledger) => ledger.changeHistories, { nullable: true })
  @JoinColumn({ name: 'ledger_id' })
  ledger?: Ledger;

  @Column({
    type: 'simple-enum',
    enum: ChangeAction,
  })
  action: ChangeAction;

  @Column({
    type: 'simple-enum',
    enum: LedgerStatus,
    nullable: true,
    name: 'from_status',
  })
  fromStatus?: LedgerStatus;

  @Column({
    type: 'simple-enum',
    enum: LedgerStatus,
    nullable: true,
    name: 'to_status',
  })
  toStatus?: LedgerStatus;

  @Column({ type: 'simple-json', nullable: true, name: 'before_data' })
  beforeData?: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true, name: 'after_data' })
  afterData?: Record<string, any>;

  @Column({ type: 'simple-json', nullable: true })
  changes?: Array<{
    field: string;
    before: any;
    after: any;
  }>;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'operator_id', nullable: true })
  operatorId?: string;

  @Column({ name: 'operator_name', nullable: true })
  operatorName?: string;

  @Column({ name: 'operator_role', nullable: true })
  operatorRole?: string;

  @Column({ name: 'version', default: 1 })
  version: number = 1;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;
}
