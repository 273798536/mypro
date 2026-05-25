import "reflect-metadata";
import express from "express";
import path from "path";
import fs from "fs";
import { AppDataSource } from "./data-source";
import workOrderRoutes from "./routes/workOrders";
import inventoryRoutes from "./routes/inventory";
import reconciliationRoutes from "./routes/reconciliation";
import dirtyRecordRoutes from "./routes/dirtyRecords";
import auditRoutes from "./routes/audit";
import exportRoutes from "./routes/export";
import sitePhotoRoutes from "./routes/sitePhotos";
import approvalEmailRoutes from "./routes/approvalEmails";
import supplierBillRoutes from "./routes/supplierBills";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use("/api/workorders", workOrderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
app.use("/api/dirty-records", dirtyRecordRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/site-photos", sitePhotoRoutes);
app.use("/api/approval-emails", approvalEmailRoutes);
app.use("/api/supplier-bills", supplierBillRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: AppDataSource.isInitialized ? "connected" : "disconnected",
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

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

AppDataSource.initialize()
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
