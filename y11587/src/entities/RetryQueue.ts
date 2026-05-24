import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type QueueItemType =
  | "PAYMENT_PROCESS"
  | "CONTRACT_ARCHIVE"
  | "EMAIL_REMINDER"
  | "PDF_GENERATE"
  | "EXTERNAL_RECEIPT"
  | "COMPENSATION"
  | "OTHER";

export type QueueStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "RETRYING"
  | "MANUAL_INTERVENTION"
  | "DEAD_LETTER"
  | "CANCELLED";

export type RetryCategory =
  | "NETWORK_ERROR"
  | "VALIDATION_ERROR"
  | "MISSING_DATA"
  | "CROSS_DAY_ISSUE"
  | "NAME_CONFLICT"
  | "AMOUNT_CONFLICT"
  | "QUANTITY_CONFLICT"
  | "SYSTEM_ERROR"
  | "BUSINESS_RULE"
  | "UNKNOWN";

@Entity()
export class RetryQueue {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  itemType: QueueItemType;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ type: "text" })
  payload: string;

  @Column({
    type: "text",
    default: "PENDING",
  })
  status: QueueStatus;

  @Column({ type: "text", nullable: true })
  retryCategory: RetryCategory;

  @Column({ type: "integer", default: 0 })
  retryCount: number;

  @Column({ type: "integer", default: 3 })
  maxRetries: number;

  @Column({ type: "datetime", nullable: true })
  nextRetryAt: string;

  @Column({ type: "integer", default: 60 })
  retryInterval: number;

  @Column({ type: "text", nullable: true })
  lastError: string;

  @Column({ type: "text", nullable: true })
  errorStack?: string;

  @Column({ type: "boolean", default: false })
  isManuallyHandled: boolean;

  @Column({ type: "text", nullable: true })
  handledBy: string;

  @Column({ type: "text", nullable: true })
  handleRemark: string;

  @Column({ type: "text", nullable: true })
  source: string;

  @Column({ type: "text", nullable: true })
  sourceRef: string;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: "datetime", nullable: true })
  processedAt: string;
}
