import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type ReceiptStatus =
  | "RECEIVED"
  | "QUEUED"
  | "PROCESSING"
  | "VERIFIED"
  | "REJECTED"
  | "COMPLETED";

export type ReceiptType =
  | "PAYMENT_CONFIRMATION"
  | "ACCEPTANCE_CONFIRMATION"
  | "SIGNATURE_CONFIRMATION"
  | "OTHER";

@Entity()
export class ExternalReceipt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  receiptNo: string;

  @Column({
    type: "text",
  })
  receiptType: ReceiptType;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ nullable: true })
  retryQueueId: string;

  @Column({ type: "text" })
  sourceSystem: string;

  @Column({ type: "text", nullable: true })
  sourceRefNo: string;

  @Column({ type: "text" })
  payload: string;

  @Column({ type: "text", nullable: true })
  signature: string;

  @Column({
    type: "text",
    default: "RECEIVED",
  })
  status: ReceiptStatus;

  @Column({ type: "text", nullable: true })
  verificationResult: string;

  @Column({ type: "text", nullable: true })
  rejectReason?: string;

  @Column({ type: "text", nullable: true })
  processedBy: string;

  @Column({ type: "datetime", nullable: true })
  processedAt: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
