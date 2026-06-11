import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Review } from "./Review";

export type HistoryAction = 
  | "create" 
  | "update" 
  | "confirm_collision" 
  | "update_remark" 
  | "export"
  | "status_change"
  | "conclusion_change";

@Entity()
export class ReviewHistory {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  action: HistoryAction;

  @Column({ type: "text", nullable: true })
  fieldName: string;

  @Column({ type: "text", nullable: true })
  oldValue: string;

  @Column({ type: "text", nullable: true })
  newValue: string;

  @Column({ type: "text", nullable: true })
  operator: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => Review, (review) => review.histories, { onDelete: "CASCADE" })
  @JoinColumn()
  review: Review;

  @Column()
  reviewId: string;

  @CreateDateColumn()
  createdAt: Date;
}
