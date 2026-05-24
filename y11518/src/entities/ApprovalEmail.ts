import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type EmailStatus = "pending" | "approved" | "rejected";

@Entity()
export class ApprovalEmail {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ unique: true })
  messageId: string;

  @Index()
  @Column({ nullable: true })
  workOrderNo: string;

  @Column()
  subject: string;

  @Column({ type: "text" })
  body: string;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column({ type: "text", nullable: true })
  cc: string;

  @Column({ type: "datetime" })
  sentTime: Date;

  @Column({ type: "datetime", nullable: true })
  receivedTime: Date;

  @Column({
    type: "varchar",
    default: "pending",
  })
  approvalStatus: EmailStatus;

  @Column({ nullable: true })
  approver: string;

  @Column({ type: "text", nullable: true })
  approvalComment: string;

  @Column({ type: "datetime", nullable: true })
  approvalTime: Date;

  @Column({ type: "simple-json", nullable: true })
  attachments: Array<{
    fileName: string;
    fileSize: number;
    contentType: string;
  }>;

  @Column({ type: "simple-json", nullable: true })
  rawData: Record<string, any>;

  @Column({ default: false })
  isDirty: boolean;

  @Column({ type: "simple-array", nullable: true })
  dirtyReasons: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
