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
import { WorkOrder } from "./WorkOrder";

@Entity()
export class MaterialUsage {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  workOrderId: string;

  @ManyToOne(() => WorkOrder, (order) => order.materialUsages)
  @JoinColumn({ name: "workOrderId" })
  workOrder: WorkOrder;

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

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: "datetime", nullable: true })
  usageTime: Date;

  @Column({ type: "text", nullable: true })
  remark: string;

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
