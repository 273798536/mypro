import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type AcceptanceEmailStatus =
  | "DRAFT"
  | "SENT"
  | "RECEIVED"
  | "CONFIRMED"
  | "REJECTED";

@Entity()
export class AcceptanceEmail {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ nullable: true })
  emailSubject: string;

  @Column({ type: "text", nullable: true })
  emailContent: string;

  @Column({ nullable: true })
  sender: string;

  @Column({ nullable: true })
  receiver: string;

  @Column({ type: "datetime", nullable: true })
  sentAt: string;

  @Column({ type: "datetime", nullable: true })
  receivedAt: string;

  @Column({
    type: "text",
    default: "DRAFT",
  })
  status: AcceptanceEmailStatus;

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
}
