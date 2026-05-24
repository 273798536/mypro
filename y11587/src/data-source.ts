import "reflect-metadata";
import { DataSource } from "typeorm";
import { Contract } from "./entities/Contract";
import { ContractVersion } from "./entities/ContractVersion";
import { PaymentNode } from "./entities/PaymentNode";
import { PaymentNodeVersion } from "./entities/PaymentNodeVersion";
import { AcceptanceEmail } from "./entities/AcceptanceEmail";
import { CustomerRemark } from "./entities/CustomerRemark";
import { ManualOpinion } from "./entities/ManualOpinion";
import { SupplementaryAgreement } from "./entities/SupplementaryAgreement";
import { RetryQueue } from "./entities/RetryQueue";
import { RetryLog } from "./entities/RetryLog";
import { DeadLetter } from "./entities/DeadLetter";
import { DirtyRecord } from "./entities/DirtyRecord";
import { OperationTrace } from "./entities/OperationTrace";
import { ExternalReceipt } from "./entities/ExternalReceipt";
import { CompensationRecord } from "./entities/CompensationRecord";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./data/legal_contract.db",
  synchronize: true,
  logging: false,
  entities: [
    Contract,
    ContractVersion,
    PaymentNode,
    PaymentNodeVersion,
    AcceptanceEmail,
    CustomerRemark,
    ManualOpinion,
    SupplementaryAgreement,
    RetryQueue,
    RetryLog,
    DeadLetter,
    DirtyRecord,
    OperationTrace,
    ExternalReceipt,
    CompensationRecord,
  ],
  migrations: [],
  subscribers: [],
});
