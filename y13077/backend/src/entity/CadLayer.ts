import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Review } from "./Review";

@Entity()
export class CadLayer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  version: string;

  @Column({ default: false })
  isOldVersion: boolean;

  @Column({ type: "text", nullable: true })
  filePath: string;

  @Column({ type: "text", nullable: true })
  layerType: string;

  @Column({ type: "text", nullable: true })
  issueDescription: string;

  @ManyToOne(() => Review, (review) => review.cadLayers, { onDelete: "CASCADE" })
  @JoinColumn()
  review: Review;

  @Column()
  reviewId: string;
}
