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

export type PhotoType = "before_repair" | "during_repair" | "after_repair" | "material_usage";

@Entity()
export class SitePhoto {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  workOrderId: string;

  @ManyToOne(() => WorkOrder, (order) => order.photos)
  @JoinColumn({ name: "workOrderId" })
  workOrder: WorkOrder;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  originalName: string;

  @Column()
  filePath: string;

  @Column({ type: "bigint", nullable: true })
  fileSize: number;

  @Column({ nullable: true })
  mimeType: string;

  @Column({
    type: "varchar",
    default: "during_repair",
  })
  photoType: PhotoType;

  @Column({ type: "datetime", nullable: true })
  captureTime: Date;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ nullable: true })
  uploader: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "simple-json", nullable: true })
  exifData: Record<string, any>;

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
