import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import { BillItem } from "./BillItem";

export type BillStatus = "draft" | "submitted" | "verified" | "reconciled" | "paid";

@Entity()
export class SupplierBill {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ unique: true })
  billNo: string;

  @Index()
  @Column()
  supplierName: string;

  @Column({ nullable: true })
  supplierCode: string;

  @Column({ type: "datetime" })
  billDate: Date;

  @Column({ type: "datetime", nullable: true })
  dueDate: Date;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  verifiedAmount: number;

  @Column({
    type: "varchar",
    default: "draft",
  })
  status: BillStatus;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ nullable: true })
  submitter: string;

  @Column({ type: "datetime", nullable: true })
  submitTime: string;

  @Column({ nullable: true })
  verifier: string;

  @Column({ type: "datetime", nullable: true })
  verifyTime: Date;

  @Column({ type: "simple-json", nullable: true })
  rawData: Record<string, any>;

  @Column({ default: false })
  isDirty: boolean;

  @Column({ type: "simple-array", nullable: true })
  dirtyReasons: string[];

  @OneToMany(() => BillItem, (item) => item.bill, { cascade: true })
  items: BillItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
