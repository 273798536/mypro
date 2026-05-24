import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type RetryActionType =
  | "ENQUEUE"
  | "PROCESS"
  | "RETRY"
  | "SUCCESS"
  | "FAILED"
  | "MANUAL_INTERVENTION"
  | "DEAD_LETTER"
  | "RESURRECT"
  | "CANCEL"
  | "UPDATE";

@Entity()
export class RetryLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  retryQueueId: string;

  @Column({
    type: "text",
  })
  actionType: RetryActionType;

  @Column({ type: "integer", nullable: true })
  retryNumber: number;

  @Column({ type: "text", nullable: true })
  previousStatus: string;

  @Column({ type: "text", nullable: true })
  newStatus: string;

  @Column({ type: "text", nullable: true })
  message: string;

  @Column({ type: "text", nullable: true })
  errorDetails: string;

  @Column({ type: "text", nullable: true })
  performedBy: string;

  @Column({ type: "text", nullable: true })
  payloadSnapshot: string;

  @CreateDateColumn()
  createdAt: Date;
}
