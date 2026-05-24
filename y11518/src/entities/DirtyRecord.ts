import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type DirtyType =
  | "missing_field"
  | "cross_day"
  | "name_changed"
  | "amount_conflict"
  | "quantity_conflict"
  | "other";

export type DirtyStatus = "pending" | "resolved" | "ignored";

export type RecordType =
  | "work_order"
  | "inventory"
  | "material_usage"
  | "site_photo"
  | "approval_email"
  | "supplier_bill"
  | "bill_item";

@Entity()
export class DirtyRecord {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  recordType: RecordType;

  @Index()
  @Column()
  recordId: string;

  @Index()
  @Column()
  dirtyType: DirtyType;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "simple-json" })
  fieldErrors: Array<{
    field: string;
    expected?: any;
    actual?: any;
    message: string;
  }>;

  @Column({ type: "simple-json", nullable: true })
  originalData: Record<string, any>;

  @Column({ type: "simple-json", nullable: true })
  correctedData: Record<string, any>;

  @Column({
    type: "varchar",
    default: "pending",
  })
  status: DirtyStatus;

  @Column({ type: "text", nullable: true })
  resolutionNote: string;

  @Column({ nullable: true })
  resolvedBy: string;

  @Column({ type: "datetime", nullable: true })
  resolvedAt: Date;

  @Column({ type: "simple-json", nullable: true })
  relatedRecords: Array<{
    recordType: string;
    recordId: string;
    relation: string;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
