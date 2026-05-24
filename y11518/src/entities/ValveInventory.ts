import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type InventoryOperation = "in" | "out" | "adjust";

@Entity()
export class ValveInventory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  materialCode: string;

  @Column()
  materialName: string;

  @Column({ nullable: true })
  specification: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: "int" })
  quantity: number;

  @Column({
    type: "varchar",
  })
  operation: InventoryOperation;

  @Index()
  @Column({ type: "datetime" })
  operationTime: Date;

  @Column({ type: "int", default: 0 })
  balanceAfter: number;

  @Column({ nullable: true })
  warehouse: string;

  @Column({ nullable: true })
  operator: string;

  @Index()
  @Column({ nullable: true })
  workOrderNo: string;

  @Column({ type: "text", nullable: true })
  remark: string;

  @Column({ type: "simple-json", nullable: true })
  rawData: Record<string, any>;

  @Column({ default: false })
  isDirty: boolean;

  @Column({ type: "simple-array", nullable: true })
  dirtyReasons: string[];

  @Column({ default: false })
  isBackfilled: boolean;

  @Column({ type: "datetime", nullable: true })
  backfillTime: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
