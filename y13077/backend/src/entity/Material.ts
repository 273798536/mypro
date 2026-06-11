import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Review } from "./Review";

@Entity()
export class Material {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  standardName: string;

  @Column()
  unit: string;

  @Column({ type: "float", default: 0 })
  quantity: number;

  @Column({ default: false })
  isNameMismatch: boolean;

  @Column({ default: false })
  isUnitMixed: boolean;

  @Column({ type: "text", nullable: true })
  issueDescription: string;

  @Column({ type: "text", nullable: true })
  floor: string;

  @ManyToOne(() => Review, (review) => review.materials, { onDelete: "CASCADE" })
  @JoinColumn()
  review: Review;

  @Column()
  reviewId: string;
}
