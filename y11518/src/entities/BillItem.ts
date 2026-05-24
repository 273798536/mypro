import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { SupplierBill } from "./SupplierBill";

@Entity()
export class BillItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  billId: string;

  @ManyToOne(() => SupplierBill, (bill) => bill.items)
  @JoinColumn({ name: "billId" })
  bill: SupplierBill;

  @Index()
  @Column({ nullable: true })
  workOrderNo: string;

  @Index()
  @Column()
  materialCode: string;

  @Column()
  materialName: string;

  @Column({ nullable: true })
  specification: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  totalAmount: number;

  @Column({ type: "int", nullable: true })
  verifiedQuantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  verifiedUnitPrice: number;

  @Column({ type: "decimal", precision: 12, scale: 2, nullable: true })
  verifiedTotalAmount: number;

  @Column({ type: "text", nullable: true })
  verifyRemark: string;

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
