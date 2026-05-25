"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const data_source_1 = require("./data-source");
const workOrders_1 = __importDefault(require("./routes/workOrders"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const reconciliation_1 = __importDefault(require("./routes/reconciliation"));
const dirtyRecords_1 = __importDefault(require("./routes/dirtyRecords"));
const audit_1 = __importDefault(require("./routes/audit"));
const export_1 = __importDefault(require("./routes/export"));
const sitePhotos_1 = __importDefault(require("./routes/sitePhotos"));
const approvalEmails_1 = __importDefault(require("./routes/approvalEmails"));
const supplierBills_1 = __importDefault(require("./routes/supplierBills"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
app.use("/api/workorders", workOrders_1.default);
app.use("/api/inventory", inventory_1.default);
app.use("/api/reconciliation", reconciliation_1.default);
app.use("/api/dirty-records", dirtyRecords_1.default);
app.use("/api/audit", audit_1.default);
app.use("/api/export", export_1.default);
app.use("/api/site-photos", sitePhotos_1.default);
app.use("/api/approval-emails", approvalEmails_1.default);
app.use("/api/supplier-bills", supplierBills_1.default);
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        data: {
            status: "ok",
            timestamp: new Date().toISOString(),
            database: data_source_1.AppDataSource.isInitialized ? "connected" : "disconnected",
        },
    });
});
app.get("/api", (req, res) => {
    res.json({
        success: true,
        data: {
            name: "水务抢修材料验收回放链路 API",
            version: "1.0.0",
            endpoints: {
                workorders: "/api/workorders",
                inventory: "/api/inventory",
                reconciliation: "/api/reconciliation",
                "dirty-records": "/api/dirty-records",
                audit: "/api/audit",
                export: "/api/export",
                "site-photos": "/api/site-photos",
                "approval-emails": "/api/approval-emails",
                "supplier-bills": "/api/supplier-bills",
            },
        },
    });
});
const dataDir = path_1.default.join(process.cwd(), "data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
data_source_1.AppDataSource.initialize()
    .then(() => {
    console.log("数据库连接成功");
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        console.log("API 文档:");
        console.log("  GET  /api/health          - 健康检查");
        console.log("  GET  /api/workorders      - 工单列表");
        console.log("  POST /api/workorders      - 创建工单");
        console.log("  GET  /api/inventory       - 库存记录");
        console.log("  POST /api/inventory/batch - 批量入库");
        console.log("  GET  /api/site-photos     - 现场照片");
        console.log("  POST /api/site-photos     - 上传照片");
        console.log("  GET  /api/approval-emails - 审批邮件");
        console.log("  POST /api/approval-emails/append - 追加邮件");
        console.log("  GET  /api/supplier-bills  - 供应商账单");
        console.log("  POST /api/supplier-bills/append - 追加账单");
        console.log("  POST /api/reconciliation/workorder/:no - 对账");
        console.log("  GET  /api/dirty-records   - 异常记录");
        console.log("  GET  /api/audit/snapshots - 审计快照");
    });
})
    .catch((error) => {
    console.error("数据库连接失败:", error);
    process.exit(1);
});
