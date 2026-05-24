import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ActionType, Role } from '../../types';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  userName: string;

  @Column({
    type: 'simple-enum',
    enum: Role
  })
  userRole: Role;

  @Column({
    type: 'simple-enum',
    enum: ActionType
  })
  actionType: ActionType;

  @Column()
  resourceType: string;

  @Column()
  @Index()
  resourceId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ type: 'json', nullable: true })
  requestBody: any;

  @Column({ type: 'json', nullable: true })
  responseBody: any;

  @Column()
  success: boolean;

  @Column({ nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
