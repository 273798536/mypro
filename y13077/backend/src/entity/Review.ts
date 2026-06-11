import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { CadLayer } from "./CadLayer";
import { Material } from "./Material";
import { Collision } from "./Collision";
import { ReviewHistory } from "./ReviewHistory";
import { ViewConfig } from "./ViewConfig";
import { Remark } from "./Remark";

export type ReviewStatus = "pending" | "processing" | "completed" | "has_issues";
export type ReviewConclusion = "pass" | "fail" | "pending";

@Entity()
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: "text", default: "pending" })
  status: ReviewStatus;

  @Column({ type: "text", default: "pending" })
  conclusion: ReviewConclusion;

  @Column({ type: "text", nullable: true })
  operatorRemark: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: false })
  isGrayRelease: boolean;

  @OneToMany(() => CadLayer, (layer) => layer.review, { cascade: true })
  cadLayers: CadLayer[];

  @OneToMany(() => Material, (material) => material.review, { cascade: true })
  materials: Material[];

  @OneToMany(() => Collision, (collision) => collision.review, { cascade: true })
  collisions: Collision[];

  @OneToMany(() => ReviewHistory, (history) => history.review, { cascade: true })
  histories: ReviewHistory[];

  @OneToMany(() => ViewConfig, (view) => view.review, { cascade: true })
  viewConfigs: ViewConfig[];

  @OneToMany(() => Remark, (remark) => remark.review, { cascade: true })
  remarks: Remark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
