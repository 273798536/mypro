import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Review } from "./Review";

export type CollisionType = 
  | "old_cad_layer" 
  | "material_name_mismatch" 
  | "unit_mixed" 
  | "floor_unit_mismatch"
  | "verbal_remark"
  | "other";

export type CollisionSeverity = "high" | "medium" | "low";

@Entity()
export class Collision {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  type: CollisionType;

  @Column({ type: "text", default: "medium" })
  severity: CollisionSeverity;

  @Column({ type: "text", nullable: true })
  location: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "text", nullable: true })
  impactOnConclusion: string;

  @Column({ default: false })
  isConfirmed: boolean;

  @Column({ type: "text", nullable: true })
  confirmedBy: string;

  @Column({ type: "text", nullable: true })
  sourceId: string;

  @Column({ type: "text", nullable: true })
  sourceType: string;

  @ManyToOne(() => Review, (review) => review.collisions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "reviewId" })
  review: Review;

  @Column()
  reviewId: string;

  @CreateDateColumn()
  createdAt: Date;
}
