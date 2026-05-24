import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type ReconcileStatus = "pending" | "matched" | "mismatch" | "partial_match";

@Entity()
export class Reconciliation {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ unique: true })
  batchNo: string;

  @Index()
  @Column()
  workOrderNo: string;

  @Column({ type: "datetime" })
  reconcileTime: Date;

  @Column({ type: "simple-json" })
  workOrderSummary: {
    orderNo: string;
    materialCount: number;
    totalAmount: number;
    materials: Array<{
      materialCode: string;
      materialName: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
    }>;
  };

  @Column({ type: "simple-json" })
  inventorySummary: {
    totalOut: number;
    totalAmount: number;
    items: Array<{
      materialCode: string;
      materialName: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      isBackfilled: boolean;
    }>;
  };

  @Column({ type: "simple-json" })
  billSummary: {
    billCount: number;
    totalAmount: number;
    items: Array<{
      billNo: string;
      materialCode: string;
      materialName: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
    }>;
  };

  @Column({ type: "simple-json" })
  matchResult: {
    quantityMatched: boolean;
    amountMatched: boolean;
    quantityDiff: number;
    amountDiff: number;
    details: Array<{
      materialCode: string;
      materialName: string;
      workOrderQty: number;
      inventoryQty: number;
      billQty: number;
      qtyDiff: number;
      workOrderAmount: number;
      inventoryAmount: number;
      billAmount: number;
      amountDiff: number;
      status: "matched" | "mismatch" | "missing_in_workorder" | "missing_in_inventory" | "missing_in_bill";
    }>;
  };

  @Column({
    type: "varchar",
    default: "pending",
  })
  status: ReconcileStatus;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ nullable: true })
  reconciledBy: string;

  @Column({ type: "simple-json", nullable: true })
  rawData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
