import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type PhotoCategory =
  | "ACCEPTANCE"
  | "DEFECT"
  | "ON_SITE"
  | "DOCUMENT"
  | "OTHER";

@Entity()
export class ExceptionPhoto {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ nullable: true })
  retryQueueId: string;

  @Column({ nullable: true })
  receiptId: string;

  @Column({ type: "text", default: "OTHER" })
  category: PhotoCategory;

  @Column()
  filePath: string;

  @Column()
  fileName: string;

  @Column({ type: "integer", nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  location: string;

  @Column({ type: "datetime", nullable: true })
  takenAt: string;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ type: "text", nullable: true })
  uploadedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
