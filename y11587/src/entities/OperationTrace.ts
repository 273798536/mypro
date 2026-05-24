import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type OperationType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "MANUAL_CORRECT"
  | "RETRY"
  | "ARCHIVE"
  | "EXPORT"
  | "COMPENSATE"
  | "CLOSE"
  | "ENQUEUE";

@Entity()
export class OperationTrace {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "text",
  })
  operationType: OperationType;

  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: "text", nullable: true })
  beforeSnapshot: string;

  @Column({ type: "text", nullable: true })
  afterSnapshot: string;

  @Column({ type: "text", nullable: true })
  changeSummary: string;

  @Column({ type: "text", nullable: true })
  operator: string;

  @Column({ type: "text", nullable: true })
  operatorRole: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ type: "text", nullable: true })
  ipAddress: string;

  @Column({ type: "text", nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;
}
