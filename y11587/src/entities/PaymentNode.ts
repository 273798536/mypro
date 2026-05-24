import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Contract } from "./Contract";
import { PaymentNodeVersion } from "./PaymentNodeVersion";

export type PaymentNodeStatus =
  | "PENDING"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "MANUAL_INTERVENTION";

export type PaymentNodeType =
  | "DEPOSIT"
  | "PROGRESS"
  | "ACCEPTANCE"
  | "RETENTION"
  | "OTHER";

@Entity()
export class PaymentNode {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column()
  nodeName: string;

  @Column({
    type: "text",
  })
  nodeType: PaymentNodeType;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  percentage: number;

  @Column({ type: "date", nullable: true })
  expectedDate: string;

  @Column({ type: "date", nullable: true })
  actualDate: string;

  @Column({ type: "integer", default: 0 })
  sortOrder: number;

  @Column({
    type: "text",
    default: "PENDING",
  })
  status: PaymentNodeStatus;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ type: "integer", default: 1 })
  version: number;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ type: "text", nullable: true })
  createdBy: string;

  @Column({ type: "text", nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Contract, (contract) => contract.paymentNodes)
  @JoinColumn({ name: "contractId" })
  contract: Contract;

  @OneToMany(() => PaymentNodeVersion, (version) => version.paymentNode)
  versions: PaymentNodeVersion[];
}
