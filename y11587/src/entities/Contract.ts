import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { PaymentNode } from "./PaymentNode";
import { ContractVersion } from "./ContractVersion";

export type ContractStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "COMPLETED"
  | "CANCELLED";

@Entity()
export class Contract {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  contractNo: string;

  @Column()
  contractName: string;

  @Column({ nullable: true })
  repairSection: string;

  @Column({ nullable: true })
  partyA: string;

  @Column({ nullable: true })
  partyB: string;

  @Column({ type: "date", nullable: true })
  signDate: string;

  @Column({ type: "date", nullable: true })
  effectiveDate: string;

  @Column({ type: "date", nullable: true })
  expiryDate: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: "text", nullable: true })
  pdfPath: string;

  @Column({ type: "text", nullable: true })
  pdfHash: string;

  @Column({
    type: "text",
    default: "DRAFT",
  })
  status: ContractStatus;

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

  @OneToMany(() => PaymentNode, (node) => node.contract)
  paymentNodes: PaymentNode[];

  @OneToMany(() => ContractVersion, (version) => version.contract)
  versions: ContractVersion[];
}
