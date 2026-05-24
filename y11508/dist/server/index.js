"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const data_source_1 = require("../db/data-source");
const service_1 = require("../db/service");
const status_link_1 = require("../engine/status-link");
const imports_1 = require("../imports");
const reports_1 = require("../reports");
const routes_1 = require("./routes");
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '医疗器械巡检验收回放链路服务运行正常',
        timestamp: new Date().toISOString()
    });
});
async function startServer() {
    try {
        await (0, data_source_1.initializeDatabase)();
        const dbService = new service_1.DatabaseService();
        const statusEngine = new status_link_1.StatusLinkEngine(dbService);
        const importService = new imports_1.DataImportService(dbService);
        const reportService = new reports_1.ReportService(dbService);
        const apiRouter = (0, routes_1.createApiRouter)(dbService, statusEngine, importService, reportService);
        app.use('/api', apiRouter);
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   医疗器械巡检验收回放链路服务                                ║
║   Medical Device Inspection Chain Service                    ║
║                                                              ║
║   服务地址: http://localhost:${PORT}                           ║
║   健康检查: http://localhost:${PORT}/health                    ║
║   API 路径: http://localhost:${PORT}/api                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
        });
        setInterval(async () => {
            await statusEngine.runFullStatusCheck();
        }, 3600000);
    }
    catch (error) {
        console.error('服务启动失败:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    startServer();
}
//# sourceMappingURL=index.js.map