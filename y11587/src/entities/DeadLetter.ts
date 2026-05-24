import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type DeadLetterStatus = "PENDING" | "RESOLVED" | "DISMISSED";

@Entity()
export class DeadLetter {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  retryQueueId: string;

  @Column()
  itemType: string;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ type: "text" })
  originalPayload: string;

  @Column({ type: "text", nullable: true })
  retryCategory: string;

  @Column({ type: "integer", default: 0 })
  retryCount: number;

  @Column({ type: "text", nullable: true })
  finalError: string;

  @Column({ type: "text", nullable: true })
  resolution: string;

  @Column({
    type: "text",
    default: "PENDING",
  })
  status: DeadLetterStatus;

  @Column({ type: "text", nullable: true })
  resolvedBy: string;

  @Column({ type: "datetime", nullable: true })
  resolvedAt: string;

  @Column({ type: "text", nullable: true })
  resolveRemark: string;

  @Column({ type: "boolean", default: false })
  isResurrected: boolean;

  @Column({ type: "text", nullable: true })
  resurrectedToQueueId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
