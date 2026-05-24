import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type SupplementaryStatus = "DRAFT" | "SIGNED" | "EFFECTIVE" | "EXPIRED";

@Entity()
export class SupplementaryAgreement {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ unique: true })
  agreementNo: string;

  @Column()
  agreementName: string;

  @Column({ type: "date", nullable: true })
  signDate: string;

  @Column({ type: "date", nullable: true })
  effectiveDate: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  amountChange: number;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  pdfPath: string;

  @Column({
    type: "text",
    default: "DRAFT",
  })
  status: SupplementaryStatus;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @Column({ type: "text", nullable: true })
  createdBy: string;

  @Column({ type: "text", nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
