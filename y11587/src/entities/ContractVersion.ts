import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Contract } from "./Contract";

@Entity()
export class ContractVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  contractId: string;

  @Column({ type: "integer" })
  version: number;

  @Column({ type: "text" })
  snapshot: string;

  @Column({ type: "text", nullable: true })
  changeReason: string;

  @Column({ type: "text", nullable: true })
  changedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Contract, (contract) => contract.versions)
  @JoinColumn({ name: "contractId" })
  contract: Contract;
}
