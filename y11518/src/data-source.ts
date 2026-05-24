import "reflect-metadata";
import { DataSource } from "typeorm";
import { WorkOrder } from "./entities/WorkOrder";
import { ValveInventory } from "./entities/ValveInventory";
import { SitePhoto } from "./entities/SitePhoto";
import { MaterialUsage } from "./entities/MaterialUsage";
import { ApprovalEmail } from "./entities/ApprovalEmail";
import { SupplierBill } from "./entities/SupplierBill";
import { BillItem } from "./entities/BillItem";
import { DirtyRecord } from "./entities/DirtyRecord";
import { AuditSnapshot } from "./entities/AuditSnapshot";
import { Reconciliation } from "./entities/Reconciliation";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./data/water-repair-audit.db",
  synchronize: true,
  logging: false,
  entities: [
    WorkOrder,
    ValveInventory,
    SitePhoto,
    MaterialUsage,
    ApprovalEmail,
    SupplierBill,
    BillItem,
    DirtyRecord,
    AuditSnapshot,
    Reconciliation,
  ],
  migrations: [],
  subscribers: [],
});
