"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const WorkOrder_1 = require("./entities/WorkOrder");
const ValveInventory_1 = require("./entities/ValveInventory");
const SitePhoto_1 = require("./entities/SitePhoto");
const MaterialUsage_1 = require("./entities/MaterialUsage");
const ApprovalEmail_1 = require("./entities/ApprovalEmail");
const SupplierBill_1 = require("./entities/SupplierBill");
const BillItem_1 = require("./entities/BillItem");
const DirtyRecord_1 = require("./entities/DirtyRecord");
const AuditSnapshot_1 = require("./entities/AuditSnapshot");
const Reconciliation_1 = require("./entities/Reconciliation");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "./data/water-repair-audit.db",
    synchronize: true,
    logging: false,
    entities: [
        WorkOrder_1.WorkOrder,
        ValveInventory_1.ValveInventory,
        SitePhoto_1.SitePhoto,
        MaterialUsage_1.MaterialUsage,
        ApprovalEmail_1.ApprovalEmail,
        SupplierBill_1.SupplierBill,
        BillItem_1.BillItem,
        DirtyRecord_1.DirtyRecord,
        AuditSnapshot_1.AuditSnapshot,
        Reconciliation_1.Reconciliation,
    ],
    migrations: [],
    subscribers: [],
});
