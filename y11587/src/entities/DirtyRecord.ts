import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type DirtyType =
  | "MISSING_FIELDS"
  | "CROSS_DAY"
  | "NAME_CHANGED"
  | "AMOUNT_CONFLICT"
  | "QUANTITY_CONFLICT"
  | "DUPLICATE"
  | "FORMAT_ERROR"
  | "OTHER";

export type DirtyStatus =
  | "IDENTIFIED"
  | "PENDING_REVIEW"
  | "RESOLVED"
  | "DISMISSED";

@Entity()
export class DirtyRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "text",
  })
  dirtyType: DirtyType;

  @Column()
  sourceTable: string;

  @Column({ nullable: true })
  sourceRecordId?: string;

  @Column({ type: "text" })
  originalData: string;

  @Column({ type: "text", nullable: true })
  correctedData: string;

  @Column({ type: "text", nullable: true })
  fieldIssues: string;

  @Column({ type: "text", nullable: true })
  conflictDetails: string;

  @Column({
    type: "text",
    default: "IDENTIFIED",
  })
  status: DirtyStatus;

  @Column({ type: "text", nullable: true })
  reviewRemark: string;

  @Column({ type: "text", nullable: true })
  reviewedBy: string;

  @Column({ type: "datetime", nullable: true })
  reviewedAt: string;

  @Column({ type: "text", nullable: true })
  resolution: string;

  @Column({ type: "boolean", default: false })
  isReconciled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
