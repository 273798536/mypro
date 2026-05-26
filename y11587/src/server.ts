import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./data-source";
import contractRoutes from "./routes/contract.routes";
import retryQueueRoutes from "./routes/retry-queue.routes";
import receiptRoutes from "./routes/receipt.routes";
import dirtyDataRoutes from "./routes/dirty-data.routes";
import reportRoutes from "./routes/report.routes";
import contractEntitiesRoutes from "./routes/contract-entities.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "法务合同履约重试补偿队列服务",
    },
  });
});

app.use("/api/contracts", contractRoutes);
app.use("/api/retry-queue", retryQueueRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/dirty-data", dirtyDataRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api", contractEntitiesRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "接口不存在",
    path: req.path,
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("服务器错误:", err);
  res.status(500).json({
    success: false,
    error: "服务器内部错误",
    message: err.message,
  });
});

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log("✓ 数据库连接成功");

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   法务合同履约重试补偿队列服务启动成功                      ║
║                                                            ║
║   服务地址: http://localhost:${PORT}                         ║
║   健康检查: http://localhost:${PORT}/health                  ║
║                                                            ║
║   API文档:                                                  ║
║     - 合同管理      POST /api/contracts                     ║
║     - 验收邮件      POST /api/acceptance-emails             ║
║     - 客服备注      POST /api/customer-remarks              ║
║     - 人工意见      POST /api/manual-opinions               ║
║     - 补充协议      POST /api/supplementary-agreements      ║
║     - 重试队列      POST /api/retry-queue/enqueue           ║
║     - 死信处理      GET  /api/retry-queue/dead-letter       ║
║     - 外部回执      POST /api/receipts/submit               ║
║     - 补偿查询      GET  /api/receipts/compensation         ║
║     - 脏数据        GET  /api/dirty-data                    ║
║     - 报表          GET  /api/reports/business              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error("启动失败:", error);
    process.exit(1);
  }
}

startServer();
