import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('status_change_logs')
export class StatusChangeLogEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  entityType: string;

  @Column()
  entityId: string;

  @Column()
  oldStatus: string;

  @Column()
  newStatus: string;

  @Column()
  changedBy: string;

  @CreateDateColumn()
  changedAt: Date;

  @Column('text')
  reason: string;
}