"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const data_source_1 = require("./data-source");
const contract_routes_1 = __importDefault(require("./routes/contract.routes"));
const retry_queue_routes_1 = __importDefault(require("./routes/retry-queue.routes"));
const receipt_routes_1 = __importDefault(require("./routes/receipt.routes"));
const dirty_data_routes_1 = __importDefault(require("./routes/dirty-data.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const contract_entities_routes_1 = __importDefault(require("./routes/contract-entities.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use("/api/contracts", contract_routes_1.default);
app.use("/api/retry-queue", retry_queue_routes_1.default);
app.use("/api/receipts", receipt_routes_1.default);
app.use("/api/dirty-data", dirty_data_routes_1.default);
app.use("/api/reports", report_routes_1.default);
app.use("/api", contract_entities_routes_1.default);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "接口不存在",
        path: req.path,
    });
});
app.use((err, req, res, next) => {
    console.error("服务器错误:", err);
    res.status(500).json({
        success: false,
        error: "服务器内部错误",
        message: err.message,
    });
});
async function startServer() {
    try {
        await data_source_1.AppDataSource.initialize();
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
    }
    catch (error) {
        console.error("启动失败:", error);
        process.exit(1);
    }
}
startServer();
