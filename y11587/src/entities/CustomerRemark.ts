import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class CustomerRemark {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  paymentNodeId: string;

  @Column({ type: "text" })
  content: string;

  @Column({ type: "boolean", default: false })
  isInternal: boolean;

  @Column({ type: "text", nullable: true })
  createdBy: string;

  @Column({ type: "text", nullable: true })
  updatedBy: string;

  @Column({ type: "boolean", default: false })
  isDeleted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
