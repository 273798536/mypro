import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from "typeorm";
import { Review } from "./Review";

export type RemarkSource = "verbal" | "written" | "operator";

@Entity()
export class Remark {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "text", default: "written" })
  source: RemarkSource;

  @Column({ type: "text", nullable: true })
  author: string;

  @Column({ type: "text", nullable: true })
  relatedCollisionId: string;

  @ManyToOne(() => Review, (review) => review.remarks, { onDelete: "CASCADE" })
  @JoinColumn()
  review: Review;

  @Column()
  reviewId: string;

  @CreateDateColumn()
  createdAt: Date;
}
