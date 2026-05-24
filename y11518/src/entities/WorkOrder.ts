import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { SitePhoto } from "./SitePhoto";
import { MaterialUsage } from "./MaterialUsage";

export type WorkOrderStatus =
  | "created"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "approved";

@Entity()
export class WorkOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ unique: true })
  orderNo: string;

  @Column()
  siteName: string;

  @Column({ nullable: true })
  siteAddress: string;

  @Column()
  reporter: string;

  @Column({ nullable: true })
  reporterPhone: string;

  @Column({ type: "datetime" })
  reportTime: Date;

  @Column({ type: "datetime", nullable: true })
  dispatchTime: Date;

  @Column({ nullable: true })
  repairTeam: string;

  @Column({ nullable: true })
  teamLeader: string;

  @Column({ type: "text", nullable: true })
  faultDescription: string;

  @Column({
    type: "varchar",
    default: "created",
  })
  status: WorkOrderStatus;

  @Column({ type: "text", nullable: true })
  repairContent: string;

  @Column({ type: "datetime", nullable: true })
  completeTime: Date;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  laborCost: number;

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  materialTotalAmount: number;

  @Column({ type: "text", nullable: true })
  approvalRemark: string;

  @Column({ nullable: true })
  approver: string;

  @Column({ type: "datetime", nullable: true })
  approvalTime: Date;

  @Column({ type: "simple-json", nullable: true })
  rawData: Record<string, any>;

  @Column({ default: false })
  isDirty: boolean;

  @Column({ type: "simple-array", nullable: true })
  dirtyReasons: string[];

  @OneToMany(() => SitePhoto, (photo) => photo.workOrder, { cascade: true })
  photos: SitePhoto[];

  @OneToMany(() => MaterialUsage, (usage) => usage.workOrder, { cascade: true })
  materialUsages: MaterialUsage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
