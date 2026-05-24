import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { PaymentNode } from "./PaymentNode";

@Entity()
export class PaymentNodeVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  paymentNodeId: string;

  @Column({ type: "integer" })
  version: number;

  @Column({ type: "text" })
  snapshot: string;

  @Column({ type: "text", nullable: true })
  changeReason: string;

  @Column({ type: "text", nullable: true })
  changedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => PaymentNode, (node) => node.versions)
  @JoinColumn({ name: "paymentNodeId" })
  paymentNode: PaymentNode;
}
