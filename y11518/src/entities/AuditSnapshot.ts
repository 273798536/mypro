import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type SnapshotType =
  | "before_create"
  | "after_create"
  | "before_update"
  | "after_update"
  | "before_delete"
  | "after_delete"
  | "before_reconcile"
  | "after_reconcile"
  | "before_rereconcile"
  | "after_rereconcile"
  | "before_export"
  | "custom";

export type TargetType =
  | "work_order"
  | "inventory"
  | "material_usage"
  | "site_photo"
  | "approval_email"
  | "supplier_bill"
  | "bill_item"
  | "dirty_record"
  | "reconciliation"
  | "system";

@Entity()
export class AuditSnapshot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  snapshotType: SnapshotType;

  @Index()
  @Column({ nullable: true })
  operationId: string;

  @Column({ nullable: true })
  operationName: string;

  @Index()
  @Column({ nullable: true })
  targetType: TargetType;

  @Index()
  @Column({ nullable: true })
  targetId: string;

  @Column({ type: "simple-json" })
  data: Record<string, any>;

  @Column({ type: "simple-json", nullable: true })
  previousData: Record<string, any>;

  @Column({ type: "simple-json", nullable: true })
  diff: Array<{
    field: string;
    op: "add" | "remove" | "replace";
    oldValue?: any;
    newValue?: any;
    path: string;
  }>;

  @Column({ nullable: true })
  operator: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @CreateDateColumn()
  createdAt: Date;
}
