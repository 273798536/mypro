import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type OpinionType = "APPROVAL" | "REJECTION" | "SUGGESTION" | "INFORMATION";

@Entity()
export class ManualOpinion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ nullable: true })
  retryQueueId: string;

  @Column({
    type: "text",
  })
  opinionType: OpinionType;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text", nullable: true })
  handler: string;

  @Column({ type: "text", nullable: true })
  department: string;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
