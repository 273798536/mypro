import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type CompensationStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type CompensationType =
  | "LATE_PAYMENT"
  | "ERROR_CORRECTION"
  | "DUPLICATE_PAYMENT"
  | "MANUAL_ADJUSTMENT"
  | "OTHER";

@Entity()
export class CompensationRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  compensationNo: string;

  @Column({
    type: "text",
  })
  compensationType: CompensationType;

  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ nullable: true })
  retryQueueId: string;

  @Column({ nullable: true })
  externalReceiptId: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: "text", nullable: true })
  currency: string;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({
    type: "text",
    default: "PENDING",
  })
  status: CompensationStatus;

  @Column({ type: "text", nullable: true })
  approvedBy: string;

  @Column({ type: "datetime", nullable: true })
  approvedAt: string;

  @Column({ type: "text", nullable: true })
  processedBy: string;

  @Column({ type: "datetime", nullable: true })
  processedAt: string;

  @Column({ type: "text", nullable: true })
  accountingRef: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ type: "text", nullable: true })
  createdBy: string;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
