import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Review } from "./Review";

export type ViewAngle = "top" | "front" | "side" | "isometric" | "custom";

@Entity()
export class ViewConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ type: "text", default: "isometric" })
  angle: ViewAngle;

  @Column({ type: "float", default: 1 })
  zoom: number;

  @Column({ type: "float", default: 0 })
  rotationX: number;

  @Column({ type: "float", default: 0 })
  rotationY: number;

  @Column({ type: "float", default: 0 })
  panX: number;

  @Column({ type: "float", default: 0 })
  panY: number;

  @Column({ type: "text", nullable: true })
  screenshotPath: string;

  @Column({ type: "text", nullable: true })
  collisionId: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => Review, (review) => review.viewConfigs, { onDelete: "CASCADE" })
  @JoinColumn()
  review: Review;

  @Column()
  reviewId: string;

  @CreateDateColumn()
  createdAt: Date;
}
